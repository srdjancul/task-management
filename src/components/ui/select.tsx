import * as React from "react";

import { cn } from "@/lib/utils";

// Native select styled like Input; the dark arrow comes from color-scheme.
function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-8 w-full min-w-0 rounded-base border border-neutral-primary bg-neutral-primary px-2 text-sm text-neutral-primary outline-none transition-colors",
        "hover:border-neutral-primary-hovered",
        "focus-visible:border-brand",
        "disabled:pointer-events-none disabled:border-neutral-primary-disabled disabled:bg-neutral-primary-disabled disabled:text-neutral-primary-disabled",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
