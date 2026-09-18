import * as React from "react";

import { cn } from "@/lib/utils";

// No input in the Figma file yet; built from the same tokens as the
// secondary outline button so the two sit together.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-base border border-neutral-primary bg-neutral-secondary px-3 text-sm text-neutral-primary outline-none transition-colors",
        "placeholder:text-neutral-tertiary",
        "hover:border-neutral-primary-hovered",
        "focus-visible:border-brand",
        "aria-invalid:border-danger",
        "disabled:pointer-events-none disabled:border-neutral-primary-disabled disabled:bg-neutral-primary-disabled disabled:text-neutral-primary-disabled",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
