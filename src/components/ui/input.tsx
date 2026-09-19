import * as React from "react";

import { cn } from "@/lib/utils";

// Finance-app input (node 47062:17141): glass-input surface, 6px radius,
// faint placeholder.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "glass-input h-10 w-full min-w-0 rounded-base px-3 text-sm text-neutral-primary outline-none transition-colors",
        "placeholder:text-neutral-faint",
        "hover:border-neutral-primary-hovered",
        "focus-visible:border-brand",
        "aria-invalid:border-danger",
        "disabled:pointer-events-none disabled:border-neutral-primary-disabled disabled:text-neutral-primary-disabled",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
