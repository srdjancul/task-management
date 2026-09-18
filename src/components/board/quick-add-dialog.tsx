"use client";

import * as React from "react";
import { Dialog } from "radix-ui";

import {
  ContactFormFields,
  readContactFields,
} from "@/components/board/contact-form-fields";
import { Button } from "@/components/ui/button";
import type { ContactFields } from "@/lib/contact-constants";

export function QuickAddDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Returns an error message, or null on success (board closes the dialog).
  onCreate: (fields: ContactFields) => Promise<string | null>;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await onCreate(readContactFields(new FormData(event.currentTarget)));
    setPending(false);
    if (result) setError(result);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setError(null);
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content aria-describedby={undefined} className="glass fixed top-1/2 left-1/2 flex w-[calc(100%-32px)] max-w-panel -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl p-4 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-medium">
            New contact
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ContactFormFields idPrefix="quick-add" />
            {error && (
              <p role="alert" className="text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={pending}>
                Add contact
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
