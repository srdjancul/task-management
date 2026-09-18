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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-secondary px-4">
      <nav className="flex items-center gap-4">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={cn(
              "rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active === tab.key
                ? "font-medium text-neutral-primary"
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
          <Button type="submit" variant="secondary" appearance="outline">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
