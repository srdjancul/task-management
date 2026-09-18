"use client";

import * as React from "react";
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
import { Plus } from "lucide-react";

import {
  ContactCard,
  ContactCardBody,
} from "@/components/board/contact-card";
import { ContactPanel } from "@/components/board/contact-panel";
import { QuickAddDialog } from "@/components/board/quick-add-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createContact, placeContact } from "@/lib/actions/contacts";
import type {
  BoardContact,
  ContactFields,
} from "@/lib/contact-constants";
import { cn } from "@/lib/utils";

/*
 * The board groups contacts under headlines (owner spec, 2026-09-19):
 * "Direct contact" and "Applied" hold the live pipeline by approach;
 * "Rejected & Ghosted" collects dead contacts from either approach.
 * Status lives on the card and in the panel; dragging between groups
 * changes approach (live groups) or buries/revives the contact.
 */
const GROUPS = [
  { key: "direct", title: "Direct contact" },
  { key: "applied", title: "Applied" },
  { key: "closed", title: "Rejected & Ghosted" },
] as const;

type GroupKey = (typeof GROUPS)[number]["key"];
type Group = { key: GroupKey; title: string; cards: BoardContact[] };

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

export function Board({ contacts: initial }: { contacts: BoardContact[] }) {
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
        cards: visible
          .filter((c) => groupOf(c) === group.key)
          .sort((a, b) => a.board_rank - b.board_rank),
      })),
    [visible],
  );

  const openContact = openId
    ? (contacts.find((c) => c.id === openId) ?? null)
    : null;

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
        ? Date.now() / 1000
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

  // Add a contact at the top of "Direct contact" (or "Applied" per the
  // form), then focus its card.
  async function handleCreate(fields: ContactFields): Promise<string | null> {
    const targetGroup = fields.approach === "applied" ? "applied" : "direct";
    const ranks = contacts
      .filter((c) => groupOf(c) === targetGroup)
      .map((c) => c.board_rank);
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

  // ←/→ walk cards in a group, ↑/↓ jump groups; with Ctrl (or Cmd) the
  // same keys move the card instead.
  function onCardKeyDown(event: React.KeyboardEvent, contact: BoardContact) {
    const groupIndex = groups.findIndex((g) => g.key === groupOf(contact));
    const cards = groups[groupIndex].cards;
    const cardIndex = cards.findIndex((c) => c.id === contact.id);
    const move = event.ctrlKey || event.metaKey;

    const focusSoon = () =>
      requestAnimationFrame(() => focusCard(contact.id));

    switch (event.key) {
      case "Enter":
        setOpenId(contact.id);
        break;
      case "ArrowLeft":
        if (move && cardIndex > 0) {
          commitPlace(contact, groups[groupIndex].key, cards[cardIndex - 1].id);
          focusSoon();
        } else if (!move) {
          focusCard(cards[cardIndex - 1]?.id);
        }
        break;
      case "ArrowRight":
        if (move && cardIndex < cards.length - 1) {
          commitPlace(
            contact,
            groups[groupIndex].key,
            cards[cardIndex + 2]?.id ?? null,
          );
          focusSoon();
        } else if (!move) {
          focusCard(cards[cardIndex + 1]?.id);
        }
        break;
      case "ArrowUp":
      case "ArrowDown": {
        const dir = event.key === "ArrowUp" ? -1 : 1;
        const target = groups[groupIndex + dir];
        if (!target) break;
        if (move) {
          commitPlace(contact, target.key, null);
          focusSoon();
        } else {
          const neighbor = target.cards;
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

  return (
    <div ref={boardRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-page flex-col gap-8 px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
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
            className="w-full sm:w-search"
          />
          <Button size="sm" onClick={() => setQuickAddOpen(true)}>
            <Plus />
            New contact
          </Button>
          <span className="text-neutral-tertiary">
            {q ? `${visible.length} of ${contacts.length}` : contacts.length}{" "}
            contacts
          </span>
          <span aria-live="polite" className="text-danger">
            {notice}
          </span>
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

        <DndContext
          id="outreach-board"
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragged(null)}
        >
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <BoardGroup
                key={group.key}
                group={group}
                onCardKeyDown={onCardKeyDown}
                onCardOpen={(contact) => {
                  if (suppressClickRef.current) return;
                  setOpenId(contact.id);
                }}
              />
            ))}
          </div>
          <DragOverlay>
            {dragged && (
              <div className="glass flex w-column cursor-grabbing flex-col gap-2 rounded-lg border-brand p-4 text-sm">
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
  onCardKeyDown,
  onCardOpen,
}: {
  group: Group;
  onCardKeyDown: (event: React.KeyboardEvent, contact: BoardContact) => void;
  onCardOpen: (contact: BoardContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.key}` });

  return (
    <section className="flex flex-col gap-6">
      {/* 24px between the headline and its group (owner spec). */}
      <header className="flex items-baseline gap-2">
        <h2 className="text-lg font-medium">{group.title}</h2>
        <span className="text-neutral-tertiary">{group.cards.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "grid items-start gap-4 rounded-lg [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]",
          isOver && "bg-neutral-secondary",
        )}
      >
        {group.cards.map((contact) => (
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
