"use client";

import * as React from "react";
import { Pencil, X } from "lucide-react";
import { Dialog } from "radix-ui";

import { ApproachBadge } from "@/components/board/contact-card";
import {
  ContactFormFields,
  readContactFields,
} from "@/components/board/contact-form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { deleteContact, updateContact } from "@/lib/actions/contacts";
import { createTouch, deleteTouch } from "@/lib/actions/touches";
import {
  STATUS_LABELS,
  TOUCH_CHANNELS,
  TOUCH_DIRECTIONS,
  type BoardContact,
  type ContactTouch,
  type TouchChannel,
  type TouchDirection,
} from "@/lib/contact-constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatWhen(iso: string) {
  const date = new Date(iso);
  return `${dateFormat.format(date)}, ${timeFormat.format(date)}`;
}

// Current time as a value for <input type="datetime-local">.
function localDateTimeNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function touchStats(touches: ContactTouch[]) {
  return {
    touch_count: touches.length,
    last_touch_at: touches[0]?.happened_at ?? null,
  };
}

function byHappenedDesc(a: ContactTouch, b: ContactTouch) {
  return b.happened_at.localeCompare(a.happened_at);
}

export function ContactPanel({
  contact,
  onClose,
  onPatch,
  onDeleted,
}: {
  contact: BoardContact;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<BoardContact>) => void;
  onDeleted: (id: string) => void;
}) {
  const [touches, setTouches] = React.useState<ContactTouch[] | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const channelRef = React.useRef<HTMLSelectElement>(null);
  const [deletePending, startDeleteTransition] = React.useTransition();
  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    let cancelled = false;
    createClient()
      .from("touches")
      .select("*")
      .eq("contact_id", contact.id)
      .order("happened_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (cancelled) return;
        if (loadError) setError("Could not load the touch history.");
        else setTouches(data);
      });
    return () => {
      cancelled = true;
    };
  }, [contact.id]);

  function handleLogTouch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const input = {
      happened_at: new Date(String(fd.get("happened_at"))).toISOString(),
      channel: String(fd.get("channel")) as TouchChannel,
      direction: String(fd.get("direction")) as TouchDirection,
      note: String(fd.get("note") ?? "").trim(),
    };
    const move = contact.status === "to_contact";

    const temp: ContactTouch = {
      id: `temp-${crypto.randomUUID()}`,
      contact_id: contact.id,
      user_id: "",
      created_at: new Date().toISOString(),
      ...input,
    };
    const previous = touches ?? [];
    const next = [temp, ...previous].sort(byHappenedDesc);

    setError(null);
    setTouches(next);
    onPatch(contact.id, {
      ...touchStats(next),
      ...(move ? { status: "contacted" as const } : {}),
    });
    form.reset();

    startTransition(async () => {
      const { touch, error: saveError } = await createTouch(
        contact.id,
        input,
        move,
      );
      if (saveError || !touch) {
        setTouches(previous);
        onPatch(contact.id, {
          ...touchStats(previous),
          ...(move ? { status: "to_contact" as const } : {}),
        });
        setError(saveError ?? "Could not log the touch.");
      } else {
        setTouches((list) =>
          (list ?? []).map((t) => (t.id === temp.id ? touch : t)),
        );
      }
    });
  }

  function handleDeleteTouch(touch: ContactTouch) {
    // Still being saved — its real id doesn't exist yet.
    if (touch.id.startsWith("temp-")) return;
    const previous = touches ?? [];
    const next = previous.filter((t) => t.id !== touch.id);
    setError(null);
    setTouches(next);
    onPatch(contact.id, touchStats(next));

    startTransition(async () => {
      const { error: deleteError } = await deleteTouch(touch.id);
      if (deleteError) {
        setTouches(previous);
        onPatch(contact.id, touchStats(previous));
        setError(deleteError);
      }
    });
  }

  function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = readContactFields(new FormData(event.currentTarget));
    const snapshot: Partial<BoardContact> = {
      first_name: contact.first_name,
      last_name: contact.last_name,
      position: contact.position,
      company: contact.company,
      company_note: contact.company_note,
      approach: contact.approach,
      source_url: contact.source_url,
    };

    setError(null);
    setEditing(false);
    onPatch(contact.id, fields);

    startTransition(async () => {
      const { error: saveError } = await updateContact(contact.id, fields);
      if (saveError) {
        onPatch(contact.id, snapshot);
        setError(saveError);
      }
    });
  }

  function handleDeleteContact() {
    startDeleteTransition(async () => {
      const { error: deleteError } = await deleteContact(contact.id);
      if (deleteError) setError(deleteError);
      else onDeleted(contact.id);
    });
  }

  const meta = [contact.position, contact.company].filter(Boolean).join(" · ");
  const sourceHref = contact.source_url
    ? /^https?:\/\//.test(contact.source_url)
      ? contact.source_url
      : `https://${contact.source_url}`
    : null;

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          // The board refocuses the originating card itself.
          onCloseAutoFocus={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key !== "t" && event.key !== "T") return;
            const target = event.target as HTMLElement;
            if (target.closest("input, select, textarea")) return;
            event.preventDefault();
            channelRef.current?.focus();
          }}
          className="fixed inset-y-0 right-0 flex w-full max-w-panel flex-col border-l border-neutral-secondary bg-neutral-primary data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
        >
          {/* Header: identity, or the edit form. */}
          <div className="flex items-start gap-2 border-b border-neutral-secondary p-4">
            {editing ? (
              <form
                onSubmit={handleSaveEdit}
                className="flex min-w-0 flex-1 flex-col gap-4"
              >
                <Dialog.Title className="sr-only">
                  Edit {contact.first_name} {contact.last_name}
                </Dialog.Title>
                <ContactFormFields idPrefix="edit" defaults={contact} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Dialog.Title className="truncate text-lg font-medium">
                    {contact.first_name} {contact.last_name}
                  </Dialog.Title>
                  {meta && (
                    <p className="truncate text-neutral-secondary">{meta}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <ApproachBadge approach={contact.approach} />
                    {/* Owner rule: rejected shows red. */}
                    <Badge
                      variant={
                        contact.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {STATUS_LABELS[contact.status]}
                    </Badge>
                    {sourceHref && (
                      <a
                        href={sourceHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-primary hover:underline"
                      >
                        Profile ↗
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit contact"
                  onClick={() => setEditing(true)}
                >
                  <Pencil />
                </Button>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Close">
                    <X />
                  </Button>
                </Dialog.Close>
              </>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {contact.company_note && !editing && (
              <p className="text-neutral-secondary">{contact.company_note}</p>
            )}

            {/* Log touch — press T to jump here. */}
            <form
              onSubmit={handleLogTouch}
              className="flex flex-col gap-2 rounded-base border border-neutral-secondary p-3"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium">Log touch</span>
                <span className="text-neutral-tertiary">T</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="touch-channel">Channel</Label>
                  <Select
                    id="touch-channel"
                    name="channel"
                    ref={channelRef}
                    defaultValue="email"
                  >
                    {TOUCH_CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="touch-direction">Direction</Label>
                  <Select id="touch-direction" name="direction" defaultValue="sent">
                    {TOUCH_DIRECTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <Input
                name="happened_at"
                type="datetime-local"
                defaultValue={localDateTimeNow()}
                required
                aria-label="When"
              />
              <Input name="note" placeholder="Note (optional)" />
              <Button type="submit" className="self-end">
                Log touch
              </Button>
            </form>

            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}

            {/* Timeline, newest first. */}
            <ul className="flex flex-col gap-3">
              {(touches ?? []).map((touch) => (
                <li
                  key={touch.id}
                  className="flex flex-col gap-1 border-b border-neutral-secondary pb-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-tertiary">
                      {formatWhen(touch.happened_at)}
                    </span>
                    <Badge variant="secondary" appearance="outline">
                      {touch.channel}
                    </Badge>
                    <span
                      className={cn(
                        touch.direction === "received"
                          ? "text-success"
                          : "text-neutral-secondary",
                      )}
                    >
                      {touch.direction}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="ml-auto"
                      aria-label="Delete touch"
                      onClick={() => handleDeleteTouch(touch)}
                    >
                      <X />
                    </Button>
                  </div>
                  {touch.note && (
                    <p className="text-neutral-secondary">{touch.note}</p>
                  )}
                </li>
              ))}
              <li className="text-neutral-tertiary">
                Added {dateFormat.format(new Date(contact.created_at))}
              </li>
            </ul>
          </div>

          {/* Danger zone. */}
          <footer className="flex items-center justify-end gap-2 border-t border-neutral-secondary p-4">
            {confirmingDelete ? (
              <>
                <span className="mr-auto text-neutral-secondary">
                  Delete {contact.first_name} and all touches?
                </span>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={deletePending}
                  onClick={handleDeleteContact}
                >
                  Delete
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="text-danger hover:text-danger"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete contact
              </Button>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
