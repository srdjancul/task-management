"use client";

import * as React from "react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getOutreachProfile,
  saveOutreachProfile,
} from "@/lib/actions/settings";

// The outreach profile Claude reads when drafting messages. Stored in
// the database (settings table), edited here — never in the repo.
export function ProfileDialog() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || loaded) return;
    getOutreachProfile().then(({ value: v, error: e }) => {
      if (e) setError(e);
      else setValue(v);
      setLoaded(true);
    });
  }, [open, loaded]);

  async function handleSave() {
    setPending(true);
    setError(null);
    const { error: saveError } = await saveOutreachProfile(value);
    setPending(false);
    if (saveError) setError(saveError);
    else setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm">
          Profile
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="glass fixed top-1/2 left-1/2 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-panel -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl p-4 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="text-lg font-medium">
            Outreach profile
          </Dialog.Title>
          <p className="text-neutral-secondary">
            Who you are, positioning, projects, tone. Claude reads this
            every time it drafts a message. Stored in your database, never
            on GitHub.
          </p>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={14}
            placeholder={loaded ? "Paste your profile here…" : "Loading…"}
            disabled={!loaded}
          />
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={handleSave} disabled={pending || !loaded}>
              Save
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
