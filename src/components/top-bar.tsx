import Image from "next/image";
import Link from "next/link";

import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", key: "outreach", label: "Outreach" },
  { href: "/planner", key: "planner", label: "Planner" },
] as const;

export function TopBar({ active }: { active: (typeof tabs)[number]["key"] }) {
  return (
    <header className="shrink-0 border-b border-neutral-secondary">
      {/* Owner spec: 12px vertical padding on the navbar. */}
      <div className="mx-auto flex w-full max-w-page items-center justify-between px-4 py-3 sm:px-8">
      <nav className="flex items-center gap-4">
        <Image
          src="/logo.png"
          alt="Task Management"
          width={230}
          height={230}
          priority
          className="size-6 shrink-0"
        />
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-base px-3 outline-none transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active === tab.key
                ? "bg-neutral-inverse font-medium text-neutral-inverse"
                : "text-neutral-secondary hover:text-neutral-primary",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-1">
        <ShortcutsDialog />
        <form action={signOut}>
          <Button type="submit" variant="secondary" appearance="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      </div>
    </header>
  );
}
