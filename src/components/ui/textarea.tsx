import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "glass-input w-full min-w-0 rounded-base px-3 py-2 text-sm text-neutral-primary outline-none transition-colors",
        "placeholder:text-neutral-faint",
        "hover:border-neutral-primary-hovered",
        "focus-visible:border-brand",
        "disabled:pointer-events-none disabled:border-neutral-primary-disabled disabled:text-neutral-primary-disabled",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
