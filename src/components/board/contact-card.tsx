"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import {
  NICHE_LABELS,
  STATUS_LABELS,
  type BoardContact,
  type ContactApproach,
  type ContactStatus,
} from "@/lib/contact-constants";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

export function daysSinceTouch(contact: BoardContact): number | null {
  if (!contact.last_touch_at) return null;
  const ms = Date.now() - new Date(contact.last_touch_at).getTime();
  return Math.max(0, Math.floor(ms / DAY_MS));
}

// Owner rule: "applied" gets the green badge, "direct" stays quiet.
export function ApproachBadge({ approach }: { approach: ContactApproach }) {
  return approach === "applied" ? (
    <Badge variant="success" dot>
      applied
    </Badge>
  ) : (
    <Badge variant="secondary" appearance="outline" dot>
      direct
    </Badge>
  );
}

// Stages where the conversation is moving — all share the yellow state.
const IN_PROGRESS = new Set<ContactStatus>([
  "followed_up",
  "in_conversation",
  "interview",
]);

// Status on the card, since the board groups by approach, not status.
// Hues: blue to contact, yellow in progress, pink replied, teal won,
// red rejected/ghosted; only "contacted" stays neutral.
export function StatusBadge({ status }: { status: ContactStatus }) {
  if (status === "rejected" || status === "ghosted") {
    return (
      <Badge variant="destructive" appearance="soft">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  // Owner spec (node 47132:828): to-contact wears the BLUE soft chip.
  if (status === "to_contact") {
    return (
      <Badge variant="info" appearance="soft">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  if (status === "won") {
    return (
      <Badge variant="success" appearance="soft">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  // In progress (node 47133:853): yellow soft chip.
  if (IN_PROGRESS.has(status)) {
    return (
      <Badge variant="warning" appearance="soft">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  // Replied (node 47135:912): pink soft chip.
  if (status === "replied") {
    return (
      <Badge variant="pink" appearance="soft">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
}

// State tint for the card surface itself (over .glass).
// Owner rule: the card tint always matches the badge hue.
export function cardTone(status: ContactStatus): string | undefined {
  if (status === "rejected" || status === "ghosted") return "glass-danger";
  if (status === "to_contact") return "glass-info";
  if (status === "won") return "glass-success";
  if (IN_PROGRESS.has(status)) return "glass-warning";
  if (status === "replied") return "glass-pink";
  return undefined;
}

// Inner content, shared by the card and the drag overlay. Every card
// renders the same three rows so all cards are the same height.
export function ContactCardBody({ contact }: { contact: BoardContact }) {
  const days = daysSinceTouch(contact);
  const meta = [contact.position, contact.company].filter(Boolean).join(" · ");

  return (
    <>
      <span className="truncate font-medium">
        {contact.first_name} {contact.last_name}
      </span>
      {/* Niche is readable at a glance, without opening the card. */}
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-neutral-secondary">
          {meta || "—"}
        </span>
        <span className="shrink-0 text-neutral-tertiary">
          {NICHE_LABELS[contact.niche]}
        </span>
      </span>
      <span className="flex items-center gap-2 pt-1">
        <StatusBadge status={contact.status} />
        <span className="text-neutral-tertiary">{contact.touch_count}×</span>
        <span
          title={
            days === null
              ? "Never touched"
              : days === 0
                ? "Last touch today"
                : `Last touch ${days} day${days === 1 ? "" : "s"} ago`
          }
          className={cn(
            "ml-auto",
            days !== null && days >= 14
              ? "text-danger"
              : days !== null && days >= 7
                ? "text-warning"
                : "text-neutral-tertiary",
          )}
        >
          {days === null ? "—" : days === 0 ? "today" : `${days}d`}
        </span>
      </span>
    </>
  );
}

export function ContactCard({
  contact,
  onKeyDown,
  onOpen,
  draggable = true,
}: {
  contact: BoardContact;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onOpen: () => void;
  // Group views are filtered/paginated — ranks would lie, so no drag.
  draggable?: boolean;
}) {
  const drag = useDraggable({ id: `drag:${contact.id}`, data: { contact } });
  const drop = useDroppable({ id: `drop:${contact.id}` });

  return (
    <button
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      type="button"
      data-card-id={contact.id}
      {...(draggable ? drag.attributes : {})}
      {...(draggable ? drag.listeners : {})}
      onKeyDown={onKeyDown}
      onClick={onOpen}
      className={cn(
        "glass glass-interactive flex w-full shrink-0 touch-manipulation flex-col gap-2 rounded-lg p-4 text-left text-sm",
        draggable && "cursor-grab",
        cardTone(contact.status),
        // .glass owns the transition (soft tint + border ease).
        "outline-none hover:border-neutral-primary-hovered focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        drag.isDragging && "opacity-50",
        drop.isOver && !drag.isDragging && "border-brand",
      )}
    >
      <ContactCardBody contact={contact} />
    </button>
  );
}
