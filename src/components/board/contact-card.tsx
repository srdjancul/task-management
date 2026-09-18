"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import type { BoardContact, ContactApproach } from "@/lib/contact-constants";
import { cn } from "@/lib/utils";

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

const DAY_MS = 86_400_000;

export function daysSinceTouch(contact: BoardContact): number | null {
  if (!contact.last_touch_at) return null;
  const ms = Date.now() - new Date(contact.last_touch_at).getTime();
  return Math.max(0, Math.floor(ms / DAY_MS));
}

// Inner content, shared by the card and the drag overlay.
export function ContactCardBody({ contact }: { contact: BoardContact }) {
  const days = daysSinceTouch(contact);
  const meta = [contact.position, contact.company].filter(Boolean).join(" · ");

  return (
    <>
      <span className="truncate font-medium">
        {contact.first_name} {contact.last_name}
      </span>
      {meta && (
        <span className="truncate text-neutral-secondary">{meta}</span>
      )}
      <span className="flex items-center gap-2">
        <ApproachBadge approach={contact.approach} />
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
        "flex w-full shrink-0 cursor-grab touch-manipulation flex-col gap-1 rounded-base border border-neutral-secondary bg-neutral-secondary p-3 text-left text-sm",
        "outline-none transition-colors hover:border-neutral-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        drag.isDragging && "opacity-50",
        drop.isOver && !drag.isDragging && "border-brand",
      )}
    >
      <ContactCardBody contact={contact} />
    </button>
  );
}
