"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import {
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
    <Badge variant="success">applied</Badge>
  ) : (
    <Badge variant="secondary" appearance="outline">
      direct
    </Badge>
  );
}

// Status on the card, since the board groups by approach, not status.
// Owner spec: rejected & ghosted wear the red soft chip; to-contact and
// won wear the teal one; everything in between stays quiet.
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
  if (status === "followed_up" || status === "in_conversation") {
    return (
      <Badge variant="warning" appearance="soft">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
}

// State tint for the card surface itself (over .glass).
export function cardTone(status: ContactStatus): string | undefined {
  if (status === "rejected" || status === "ghosted") return "glass-danger";
  if (status === "to_contact" || status === "won") return "glass-positive";
  if (status === "followed_up" || status === "in_conversation")
    return "glass-warning";
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
      <span className="truncate text-neutral-secondary">{meta || "—"}</span>
      <span className="flex items-center gap-2 pt-1">
        <StatusBadge status={contact.status} />
        <span className="text-neutral-tertiary">{contact.touch_count}×</span>
        <span
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
}: {
  contact: BoardContact;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onOpen: () => void;
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
      {...drag.attributes}
      {...drag.listeners}
      onKeyDown={onKeyDown}
      onClick={onOpen}
      className={cn(
        "glass flex w-full shrink-0 cursor-grab touch-manipulation flex-col gap-2 rounded-lg p-4 text-left text-sm",
        cardTone(contact.status),
        "outline-none transition-colors hover:border-neutral-primary-hovered focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        drag.isDragging && "opacity-50",
        drop.isOver && !drag.isDragging && "border-brand",
      )}
    >
      <ContactCardBody contact={contact} />
    </button>
  );
}
