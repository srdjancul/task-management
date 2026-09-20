"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/button";

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Outreach board",
    rows: [
      ["C", "New contact"],
      ["/", "Search"],
      ["← →", "Walk cards in a group"],
      ["↑ ↓", "Jump between groups"],
      ["Ctrl + ← →", "Reorder the focused card"],
      ["Ctrl + ↑ ↓", "Move the card to another group"],
      ["Enter", "Open the focused contact"],
      ["Esc", "Close panel / clear search"],
    ],
  },
  {
    title: "Contact panel",
    rows: [
      ["M", "Draft an outreach message"],
      ["T", "Jump to the log-touch form"],
      ["Esc", "Close"],
    ],
  },
  {
    title: "Anywhere",
    rows: [["?", "This overview"]],
  },
];

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded-sm border border-neutral-primary bg-neutral-secondary px-1 font-sans text-sm text-neutral-secondary">
      {children}
    </kbd>
  );
}

export function ShortcutsDialog() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "?" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]"))
        return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {/* Hidden on touch-sized screens — shortcuts need a keyboard. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Keyboard shortcuts"
          className="max-sm:hidden"
        >
          <Keyboard />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content aria-describedby={undefined} className="glass fixed top-1/2 left-1/2 flex w-[calc(100%-32px)] max-w-panel -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl p-4 max-h-[calc(100dvh-32px)] overflow-y-auto data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <Dialog.Title className="text-lg font-medium">
            Keyboard shortcuts
          </Dialog.Title>
          <div className="flex flex-col gap-4">
            {GROUPS.map((group) => (
              <section key={group.title} className="flex flex-col gap-2">
                <h3 className="font-medium text-neutral-secondary">
                  {group.title}
                </h3>
                <ul className="flex flex-col gap-1">
                  {group.rows.map(([keys, what]) => (
                    <li
                      key={keys}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-neutral-secondary">{what}</span>
                      <Key>{keys}</Key>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
