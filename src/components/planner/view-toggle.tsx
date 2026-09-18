import Link from "next/link";

import { cn } from "@/lib/utils";

const linkClass =
  "inline-flex h-8 items-center rounded-base px-3 text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function PlannerViewToggle({
  date,
  active,
}: {
  date: string;
  active: "day" | "week";
}) {
  return (
    <div className="flex gap-1">
      <Link
        href={`/planner?d=${date}`}
        aria-current={active === "day" ? "page" : undefined}
        className={cn(
          linkClass,
          active === "day"
            ? "bg-neutral-secondary font-medium text-neutral-primary"
            : "text-neutral-secondary hover:text-neutral-primary",
        )}
      >
        Day
      </Link>
      <Link
        href={`/planner?d=${date}&view=week`}
        aria-current={active === "week" ? "page" : undefined}
        className={cn(
          linkClass,
          active === "week"
            ? "bg-neutral-secondary font-medium text-neutral-primary"
            : "text-neutral-secondary hover:text-neutral-primary",
        )}
      >
        Week
      </Link>
    </div>
  );
}
