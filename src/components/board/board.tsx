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
import { createContact, moveContact } from "@/lib/actions/contacts";
import type { ContactFields } from "@/lib/contact-constants";
import {
  CONTACT_STATUSES,
  STATUS_LABELS,
  type BoardContact,
  type ContactStatus,
} from "@/lib/contact-constants";
import { cn } from "@/lib/utils";

type Column = { status: ContactStatus; cards: BoardContact[] };

// Prefer a card under the pointer over its column, so drops land between
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
        `${c.first_name} ${c.last_name} ${c.company}`
          .toLowerCase()
          .includes(q),
      )
    : contacts;

  const columns: Column[] = React.useMemo(
    () =>
      CONTACT_STATUSES.map((status) => ({
        status,
        cards: visible
          .filter((c) => c.status === status)
          .sort((a, b) => a.board_rank - b.board_rank),
      })),
    [visible],
  );

  // Mouse: drag after 4px. Touch: press-and-hold to lift, so a plain swipe
  // still scrolls the board.
  const openContact = openId
    ? (contacts.find((c) => c.id === openId) ?? null)
    : null;

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

  // Move `contact` into `status`, before card `beforeId` (null = end).
  // Optimistic: state first, then the server action; revert on error.
  function commitMove(
    contact: BoardContact,
    status: ContactStatus,
    beforeId: string | null,
  ) {
    const column = columns.find((c) => c.status === status);
    if (!column) return;
    const cards = column.cards.filter((c) => c.id !== contact.id);
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

    const snapshot = contacts;
    setContacts((all) =>
      all.map((c) =>
        c.id === contact.id ? { ...c, status, board_rank: rank } : c,
      ),
    );
    startTransition(async () => {
      const { error } = await moveContact(contact.id, status, rank);
      if (error) {
        setContacts(snapshot);
        setNotice(error);
      }
    });
  }

  // Add a contact at the top of "To contact", then focus its card.
  async function handleCreate(fields: ContactFields): Promise<string | null> {
    const ranks = contacts
      .filter((c) => c.status === "to_contact")
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
      if (target) commitMove(contact, target.status, targetId);
    } else if (overId.startsWith("col:")) {
      commitMove(contact, overId.slice(4) as ContactStatus, null);
    }
  }

  // Arrows move focus between cards; Ctrl (or Cmd) + arrows move the card.
  function onCardKeyDown(event: React.KeyboardEvent, contact: BoardContact) {
    const colIndex = CONTACT_STATUSES.indexOf(contact.status);
    const cards = columns[colIndex].cards;
    const cardIndex = cards.findIndex((c) => c.id === contact.id);
    const move = event.ctrlKey || event.metaKey;

    const focusSoon = () =>
      requestAnimationFrame(() => focusCard(contact.id));

    switch (event.key) {
      case "Enter":
        setOpenId(contact.id);
        break;
      case "ArrowUp":
        if (move && cardIndex > 0) {
          commitMove(contact, contact.status, cards[cardIndex - 1].id);
          focusSoon();
        } else if (!move) {
          focusCard(cards[cardIndex - 1]?.id);
        }
        break;
      case "ArrowDown":
        if (move && cardIndex < cards.length - 1) {
          commitMove(contact, contact.status, cards[cardIndex + 2]?.id ?? null);
          focusSoon();
        } else if (!move) {
          focusCard(cards[cardIndex + 1]?.id);
        }
        break;
      case "ArrowLeft":
      case "ArrowRight": {
        const dir = event.key === "ArrowLeft" ? -1 : 1;
        if (move) {
          const target = CONTACT_STATUSES[colIndex + dir];
          if (target) {
            commitMove(contact, target, null);
            focusSoon();
          }
        } else {
          for (
            let i = colIndex + dir;
            i >= 0 && i < columns.length;
            i += dir
          ) {
            const neighbor = columns[i].cards;
            if (neighbor.length > 0) {
              focusCard(
                neighbor[Math.min(cardIndex, neighbor.length - 1)].id,
              );
              break;
            }
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
    <div ref={boardRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-3 pt-3 sm:px-4">
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
        <Button onClick={() => setQuickAddOpen(true)}>
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

      <DndContext
        id="outreach-board"
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragged(null)}
      >
        <div className="flex min-h-0 flex-1 snap-x gap-3 overflow-x-auto scroll-px-3 px-3 pt-3 pb-4 sm:scroll-px-4 sm:px-4">
          {columns.map((column) => (
            <BoardColumn
              key={column.status}
              column={column}
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
            <div className="flex w-column cursor-grabbing flex-col gap-1 rounded-base border border-brand bg-neutral-secondary p-3 text-sm">
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
          onClose={() => setOpenId(null)}
          onPatch={patchContact}
          onDeleted={(id) => {
            setOpenId(null);
            setContacts((all) => all.filter((c) => c.id !== id));
          }}
        />
      )}
    </div>
  );
}

function BoardColumn({
  column,
  onCardKeyDown,
  onCardOpen,
}: {
  column: Column;
  onCardKeyDown: (event: React.KeyboardEvent, contact: BoardContact) => void;
  onCardOpen: (contact: BoardContact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${column.status}` });

  return (
    <section className="flex w-column shrink-0 snap-start flex-col gap-2">
      <header className="flex items-baseline gap-2 px-1">
        <h2 className="font-medium text-neutral-secondary">
          {STATUS_LABELS[column.status]}
        </h2>
        <span className="text-neutral-tertiary">{column.cards.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-base p-1",
          isOver && "bg-neutral-primary-hovered",
        )}
      >
        {column.cards.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onKeyDown={(e) => onCardKeyDown(e, contact)}
            onOpen={() => onCardOpen(contact)}
          />
        ))}
        {column.cards.length === 0 && (
          <div className="h-16 shrink-0 rounded-base border border-dashed border-neutral-secondary" />
        )}
      </div>
    </section>
  );
}
