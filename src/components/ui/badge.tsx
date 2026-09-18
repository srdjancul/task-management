import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Restyled to the Figma "badge" component (node 14006:1916).
const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-transparent px-2 text-sm font-regular whitespace-nowrap [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-neutral-inverse text-neutral-inverse",
        secondary: "bg-neutral-secondary text-neutral-primary",
        destructive: "bg-danger text-neutral-inverse",
        success: "bg-success text-neutral-primary",
        info: "bg-info text-neutral-inverse",
        warning: "bg-warning text-neutral-primary",
      },
      appearance: {
        filled: "",
        outline: "",
      },
    },
    compoundVariants: [
      {
        variant: "secondary",
        appearance: "outline",
        className: "border-neutral-primary bg-neutral-primary",
      },
    ],
    defaultVariants: {
      variant: "primary",
      appearance: "filled",
    },
  },
);

function Badge({
  className,
  variant,
  appearance,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-appearance={appearance}
      className={cn(badgeVariants({ variant, appearance, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
