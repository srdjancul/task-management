"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  cardTone,
  ContactCard,
  ContactCardBody,
} from "@/components/board/contact-card";
import { ContactPanel } from "@/components/board/contact-panel";
import { QuickAddDialog } from "@/components/board/quick-add-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createContact, placeContact } from "@/lib/actions/contacts";
import {
  NICHE_LABELS,
  NICHES,
  type BoardContact,
  type ContactFields,
  type ContactNiche,
} from "@/lib/contact-constants";
import { cn } from "@/lib/utils";

/*
 * Views (owner spec, 2026-09-21):
 * - Home ("All"): every group as a one-row preview (5 cards) with a
 *   "View all" link; drag and drop lives here.
 * - Group view (?g=direct|applied|closed): the full group, paginated
 *   (6 rows -> 30 cards per page), filterable by company niche tabs.
 *   No dragging — the list is filtered/paginated, ranks would lie.
 */
const GROUPS = [
  { key: "direct", title: "Direct contact" },
  { key: "applied", title: "Applied" },
  { key: "closed", title: "Rejected & Ghosted" },
] as const;

type GroupKey = (typeof GROUPS)[number]["key"];
type Group = { key: GroupKey; title: string; cards: BoardContact[] };

const HOME_PREVIEW = 5; // one row at full width
const PAGE_SIZE = 30; // six rows at full width

// Owner spec 2026-09-22: every list reads newest activity first — a
// contact touched yesterday sits before one touched last month.
// Contacts with no history fall to the end, ordered by board_rank so
// dragging still decides their order.
function byActivity(a: BoardContact, b: BoardContact) {
  if (a.last_touch_at && b.last_touch_at)
    return b.last_touch_at.localeCompare(a.last_touch_at);
  if (a.last_touch_at) return -1;
  if (b.last_touch_at) return 1;
  return a.board_rank - b.board_rank;
}

function groupOf(contact: BoardContact): GroupKey {
  if (contact.status === "rejected" || contact.status === "ghosted")
    return "closed";
  return contact.approach === "applied" ? "applied" : "direct";
}

// What moving a card into `target` means for its data.
function transitionFor(
  contact: BoardContact,
  target: GroupKey,
): Partial<Pick<BoardContact, "status" | "approach">> {
  const from = groupOf(contact);
  if (from === target) return {};
  if (target === "closed") return { status: "ghosted" };
  // Leaving the dead pool revives the contact at the top of the funnel.
  return {
    approach: target === "applied" ? "applied" : "direct",
    ...(from === "closed" ? { status: "to_contact" as const } : {}),
  };
}

// Prefer a card under the pointer over its group, so drops land between
// cards; fall back to plain intersection near edges.
const collisionDetection: CollisionDetection = (args) => {
  const withinPointer = pointerWithin(args);
  const cardHits = withinPointer.filter((c) =>
    String(c.id).startsWith("drop:"),
  );
  if (cardHits.length > 0) return cardHits;
  if (withinPointer.length > 0) return withinPointer;
  return rectIntersection(args);
};

// Page numbers with an ellipsis window: 1 … 4 5 6 … 12
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7)
    return Array.from({ length: total }, (_, index) => index + 1);
  const middle = [current - 1, current, current + 1].filter(
    (p) => p > 1 && p < total,
  );
  const out: (number | "…")[] = [1];
  if (middle[0] !== undefined && middle[0] > 2) out.push("…");
  out.push(...middle);
  if (middle.length && middle[middle.length - 1] < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function Board({ contacts: initial }: { contacts: BoardContact[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [contacts, setContacts] = React.useState(initial);
  const [query, setQuery] = React.useState("");
  const [dragged, setDragged] = React.useState<BoardContact | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);
  // A click fires right after a drop; ignore it so drags don't open panels.
  const suppressClickRef = React.useRef(false);
  const [, startTransition] = React.useTransition();

  // --- View state lives in the URL: back button and refresh both work. ---
  const groupParam = searchParams.get("g");
  const activeGroup =
    GROUPS.find((g) => g.key === groupParam)?.key ?? null; // null = home
  const nicheParam = searchParams.get("n") as ContactNiche | null;
  const activeNiche =
    nicheParam && NICHES.includes(nicheParam) ? nicheParam : null;
  const pageParam = Number.parseInt(searchParams.get("p") ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  function setView(next: {
    g?: GroupKey | null;
    n?: ContactNiche | null;
    p?: number;
  }) {
    const g = next.g === undefined ? activeGroup : next.g;
    const n = next.n === undefined ? activeNiche : next.n;
    const p = next.p === undefined ? 1 : next.p;
    const sp = new URLSearchParams();
    if (g) sp.set("g", g);
    if (g && n) sp.set("n", n);
    if (g && p > 1) sp.set("p", String(p));
    router.push(sp.size ? `${pathname}?${sp.toString()}` : pathname);
  }

  // Server data changed (navigation, refresh) → adopt it.
  const [prevInitial, setPrevInitial] = React.useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setContacts(initial);
  }

  // Global shortcuts while no dialog is open: "/" focuses search, "C"
  // opens quick add.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || quickAddOpen || openId) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickAddOpen, openId]);

  React.useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? contacts.filter((c) =>
        `${c.first_name} ${c.last_name} ${c.company} ${c.position}`
          .toLowerCase()
          .includes(q),
      )
    : contacts;

  const groups: Group[] = React.useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        cards: visible.filter((c) => groupOf(c) === group.key).sort(byActivity),
      })),
    [visible],
  );

  const openContact = openId
    ? (contacts.find((c) => c.id === openId) ?? null)
    : null;

  // --- Group-view derivations -------------------------------------------
  const groupData = activeGroup
    ? groups.find((g) => g.key === activeGroup)!
    : null;
  const nicheCounts = React.useMemo(() => {
    const counts = new Map<ContactNiche, number>();
    for (const card of groupData?.cards ?? []) {
      counts.set(card.niche, (counts.get(card.niche) ?? 0) + 1);
    }
    return counts;
  }, [groupData]);
  const nicheFiltered = groupData
    ? activeNiche
      ? groupData.cards.filter((c) => c.niche === activeNiche)
      : groupData.cards
    : [];
  const pageCount = Math.max(1, Math.ceil(nicheFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageCards = nicheFiltered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Mouse: drag after 4px. Touch: press-and-hold to lift, so a plain swipe
  // still scrolls the board.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  function focusCard(id: string | undefined) {
    if (!id) return;
    boardRef.current
      ?.querySelector<HTMLElement>(`[data-card-id="${id}"]`)
      ?.focus();
  }

  // Move `contact` into `target`, before card `beforeId` (null = end).
  // Optimistic: state first, then the server action; revert on error.
  function commitPlace(
    contact: BoardContact,
    target: GroupKey,
    beforeId: string | null,
  ) {
    const group = groups.find((g) => g.key === target);
    if (!group) return;
    const cards = group.cards.filter((c) => c.id !== contact.id);
    const foundIndex = beforeId
      ? cards.findIndex((c) => c.id === beforeId)
      : -1;
    const index = foundIndex === -1 ? cards.length : foundIndex;
    const prev = cards[index - 1]?.board_rank;
    const next = cards[index]?.board_rank;
    const rank =
      prev == null && next == null
        ? // eslint-disable-next-line react-hooks/purity -- event handler, not render
          Date.now() / 1000
        : prev == null
          ? next! - 1
          : next == null
            ? prev + 1
            : (prev + next) / 2;

    const change = transitionFor(contact, target);
    const snapshot = contacts;
    setContacts((all) =>
      all.map((c) =>
        c.id === contact.id ? { ...c, ...change, board_rank: rank } : c,
      ),
    );
    startTransition(async () => {
      const { error } = await placeContact(contact.id, {
        ...(change.status ? { status: change.status } : {}),
        ...(change.approach ? { approach: change.approach } : {}),
        boardRank: rank,
      });
      if (error) {
        setContacts(snapshot);
        setNotice(error);
      }
    });
  }

  // Add a contact at the top of its approach group, then focus its card.
  async function handleCreate(fields: ContactFields): Promise<string | null> {
    const targetGroup = fields.approach === "applied" ? "applied" : "direct";
    const ranks = contacts
      .filter((c) => groupOf(c) === targetGroup)
      .map((c) => c.board_rank);
    // eslint-disable-next-line react-hooks/purity -- event handler, not render
    const rank = ranks.length ? Math.min(...ranks) - 1 : Date.now() / 1000;

    const { contact, error } = await createContact(fields, rank);
    if (error || !contact) return error ?? "Could not save the contact.";

    setContacts((all) => [
      { ...contact, touch_count: 0, last_touch_at: null },
      ...all,
    ]);
    setQuickAddOpen(false);
    requestAnimationFrame(() => focusCard(contact.id));
    return null;
  }

  function patchContact(id: string, patch: Partial<BoardContact>) {
    setContacts((all) =>
      all.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function onDragStart(event: DragStartEvent) {
    suppressClickRef.current = true;
    setDragged((event.active.data.current?.contact as BoardContact) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragged(null);
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    const contact = event.active.data.current?.contact as
      | BoardContact
      | undefined;
    const overId = String(event.over?.id ?? "");
    if (!contact || !overId) return;

    if (overId.startsWith("drop:")) {
      const targetId = overId.slice(5);
      if (targetId === contact.id) return;
      const target = contacts.find((c) => c.id === targetId);
      if (target) commitPlace(contact, groupOf(target), targetId);
    } else if (overId.startsWith("group:")) {
      commitPlace(contact, overId.slice(6) as GroupKey, null);
    }
  }

  // ←/→ walk cards, ↑/↓ jump groups (home only); with Ctrl the same keys
  // move the card — also home only, where ranks are truthful.
  function onCardKeyDown(event: React.KeyboardEvent, contact: BoardContact) {
    const inGroupView = activeGroup !== null;
    const list = inGroupView
      ? pageCards
      : groups[GROUPS.findIndex((g) => g.key === groupOf(contact))].cards;
    const groupIndex = GROUPS.findIndex((g) => g.key === groupOf(contact));
    const cardIndex = list.findIndex((c) => c.id === contact.id);
    const move = (event.ctrlKey || event.metaKey) && !inGroupView;

    const focusSoon = () =>
      requestAnimationFrame(() => focusCard(contact.id));

    switch (event.key) {
      case "Enter":
        setOpenId(contact.id);
        break;
      case "ArrowLeft":
        if (move && cardIndex > 0) {
          commitPlace(contact, GROUPS[groupIndex].key, list[cardIndex - 1].id);
          focusSoon();
        } else if (!move) {
          focusCard(list[cardIndex - 1]?.id);
        }
        break;
      case "ArrowRight":
        if (move && cardIndex < list.length - 1) {
          commitPlace(
            contact,
            GROUPS[groupIndex].key,
            list[cardIndex + 2]?.id ?? null,
          );
          focusSoon();
        } else if (!move) {
          focusCard(list[cardIndex + 1]?.id);
        }
        break;
      case "ArrowUp":
      case "ArrowDown": {
        if (inGroupView) return;
        const dir = event.key === "ArrowUp" ? -1 : 1;
        const target = GROUPS[groupIndex + dir];
        if (!target) break;
        if (move) {
          commitPlace(contact, target.key, null);
          focusSoon();
        } else {
          const neighbor = groups[groupIndex + dir].cards.slice(
            0,
            HOME_PREVIEW,
          );
          if (neighbor.length > 0) {
            focusCard(neighbor[Math.min(cardIndex, neighbor.length - 1)].id);
          }
        }
        break;
      }
      default:
        return;
    }
    event.preventDefault();
  }

  const cardOpenProps = {
    onCardKeyDown,
    onCardOpen: (contact: BoardContact) => {
      if (suppressClickRef.current) return;
      setOpenId(contact.id);
    },
  };

  return (
    <div ref={boardRef} className="min-h-0 flex-1 overflow-y-auto">
      {/* Keyed by view: entering home or a group replays the drift-in. */}
      <div
        key={activeGroup ?? "home"}
        className="page-enter mx-auto flex w-full max-w-page flex-col gap-6 px-4 pt-8 pb-6 sm:px-8"
      >
        {/* Toolbar: search + New contact left, view tabs right. */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-search">
            {/* z-10: the input's backdrop blur paints above plain siblings. */}
            <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-5 -translate-y-1/2 text-neutral-faint" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                if (query) setQuery("");
                else e.currentTarget.blur();
              }}
              placeholder="Search — press /"
              aria-label="Search contacts"
              className="pr-8 pl-10"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm text-neutral-tertiary outline-none hover:text-neutral-primary focus-visible:outline-2 focus-visible:outline-brand"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {/* Same height as the search input beside it. */}
          <Button onClick={() => setQuickAddOpen(true)}>
            <Plus />
            New contact
          </Button>
          <span aria-live="polite" className="text-danger">
            {notice}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-hairline">
            {activeGroup === null ? (
              // Home: group tabs. "All" is the home view itself.
              <>
                <Button aria-current="page">All</Button>
                {GROUPS.map((group) => (
                  <Button
                    key={group.key}
                    variant="tab"
                    onClick={() => setView({ g: group.key, n: null, p: 1 })}
                  >
                    {group.title}
                  </Button>
                ))}
              </>
            ) : (
              // Group view: niche tabs (only niches present in the group).
              // Niche tabs toggle: clicking the active one clears the filter.
              NICHES.filter((n) => (nicheCounts.get(n) ?? 0) > 0).map((n) => (
                <Button
                  key={n}
                  variant={activeNiche === n ? "primary" : "tab"}
                  aria-current={activeNiche === n ? "page" : undefined}
                  onClick={() =>
                    setView({ n: activeNiche === n ? null : n, p: 1 })
                  }
                >
                  {NICHE_LABELS[n]}
                </Button>
              ))
            )}
          </div>
        </div>

        {contacts.length === 0 && (
          <p className="text-neutral-secondary">
            No contacts yet — press{" "}
            <kbd className="rounded-sm border border-neutral-primary bg-neutral-secondary px-1">
              C
            </kbd>{" "}
            or click New contact to add the first one.
          </p>
        )}

        {q && visible.length === 0 && contacts.length > 0 && (
          <p className="text-neutral-secondary">
            No matches for “{query.trim()}” — check the spelling or clear the
            search (Esc).
          </p>
        )}

        <DndContext
          id="outreach-board"
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragged(null)}
        >
          {activeGroup === null ? (
            <div className="flex flex-col gap-8">
              {groups.map((group) => (
                <BoardGroup
                  key={group.key}
                  group={group}
                  searching={Boolean(q)}
                  onViewAll={() => setView({ g: group.key, n: null, p: 1 })}
                  {...cardOpenProps}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Breadcrumb headline: Home at 60%, current at 100%. */}
                <h2 className="flex items-center gap-2 text-lg font-medium">
                  <button
                    type="button"
                    onClick={() => setView({ g: null, n: null, p: 1 })}
                    className="rounded-sm text-neutral-primary opacity-60 outline-none transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    Home
                  </button>
                  <span aria-hidden className="opacity-60">/</span>
                  <span>{groupData!.title}</span>
                </h2>
                <span className="rounded-base border border-neutral-secondary bg-neutral-soft px-2 py-1 text-sm leading-none text-neutral-secondary backdrop-blur-xs">
                  {nicheFiltered.length}
                </span>
              </div>

              {/* Keyed by niche + page so tab and pagination clicks
                  drift the cards in instead of snapping. */}
              <div
                key={`${activeNiche ?? "all"}-${safePage}`}
                className="content-enter grid items-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]"
              >
                {pageCards.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    draggable={false}
                    onKeyDown={(e) => onCardKeyDown(e, contact)}
                    onOpen={() => cardOpenProps.onCardOpen(contact)}
                  />
                ))}
              </div>

              {pageCards.length === 0 && (
                <p className="text-neutral-secondary">
                  Nothing here{activeNiche ? ` in ${NICHE_LABELS[activeNiche]}` : ""}
                  {q ? " for this search" : ""}.
                </p>
              )}

              {pageCount > 1 && (
                <nav
                  aria-label="Pagination"
                  className="flex items-center justify-center gap-1 pt-2"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous page"
                    disabled={safePage === 1}
                    onClick={() => setView({ p: safePage - 1 })}
                  >
                    <ChevronLeft />
                  </Button>
                  {pageWindow(safePage, pageCount).map((p, index) =>
                    p === "…" ? (
                      <span
                        key={`gap-${index}`}
                        className="px-1 text-neutral-tertiary"
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        size="sm"
                        variant={p === safePage ? "primary" : "ghost"}
                        aria-current={p === safePage ? "page" : undefined}
                        onClick={() => setView({ p })}
                      >
                        {p}
                      </Button>
                    ),
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next page"
                    disabled={safePage === pageCount}
                    onClick={() => setView({ p: safePage + 1 })}
                  >
                    <ChevronRight />
                  </Button>
                </nav>
              )}
            </div>
          )}
          <DragOverlay>
            {dragged && (
              <div
                className={cn(
                  "glass flex w-column cursor-grabbing flex-col gap-2 rounded-lg border-brand p-4 text-sm",
                  cardTone(dragged.status),
                )}
              >
                <ContactCardBody contact={dragged} />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <QuickAddDialog
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onCreate={handleCreate}
        />
        {openContact && (
          <ContactPanel
            contact={openContact}
            onClose={() => {
              const id = openId;
              setOpenId(null);
              // Hand focus back to the card the panel came from.
              requestAnimationFrame(() => focusCard(id ?? undefined));
            }}
            onPatch={patchContact}
            onDeleted={(id) => {
              setOpenId(null);
              setContacts((all) => all.filter((c) => c.id !== id));
            }}
          />
        )}
      </div>
    </div>
  );
}

function BoardGroup({
  group,
  searching,
  onViewAll,
  onCardKeyDown,
  onCardOpen,
}: {
  group: Group;
  searching: boolean;
  onViewAll: () => void;
  onCardKeyDown: (event: React.KeyboardEvent, contact: BoardContact) => void;
  onCardOpen: (contact: BoardContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.key}` });

  // While filtering, an empty group is noise — hide it entirely.
  if (searching && group.cards.length === 0) return null;

  const preview = group.cards.slice(0, HOME_PREVIEW);

  return (
    <section className="flex flex-col gap-4">
      {/* 16px between the headline and its group (owner spec). */}
      <header className="flex items-center gap-2">
        <h2 className="text-lg font-medium">{group.title}</h2>
        <span className="rounded-base border border-neutral-secondary bg-neutral-soft px-2 py-1 text-sm leading-none text-neutral-secondary backdrop-blur-xs">
          {group.cards.length}
        </span>
        {group.cards.length > 0 && (
          <Button
            variant="tab"
            size="sm"
            className="ml-auto"
            onClick={onViewAll}
          >
            View all
            <ArrowRight />
          </Button>
        )}
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "grid items-start gap-4 rounded-lg [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]",
          isOver && "bg-neutral-secondary",
        )}
      >
        {preview.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onKeyDown={(e) => onCardKeyDown(e, contact)}
            onOpen={() => onCardOpen(contact)}
          />
        ))}
        {group.cards.length === 0 && (
          <div className="h-16 rounded-lg border border-dashed border-neutral-secondary" />
        )}
      </div>
    </section>
  );
}
