import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Restyled to the Figma "badge" component (node 14006:1916).
const badgeVariants = cva(
  // Owner spec: badge padding 12x8, radius 4.
  "inline-flex shrink-0 items-center gap-1 rounded-sm border border-transparent px-3 py-2 text-sm leading-none font-regular whitespace-nowrap [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-neutral-inverse text-neutral-inverse",
        // Owner spec: uncolored badges carry a white/10 stroke.
        secondary:
          "border-neutral-secondary bg-neutral-secondary text-neutral-primary",
        destructive: "bg-danger text-neutral-primary",
        success: "bg-success text-neutral-inverse",
        info: "bg-info text-neutral-primary",
        warning: "bg-warning text-neutral-inverse",
      },
      appearance: {
        filled: "",
        outline: "",
        // Finance-app chip: 10% tint fill + border, full-strength text.
        soft: "",
      },
    },
    compoundVariants: [
      {
        variant: "secondary",
        appearance: "outline",
        className: "border-neutral-primary bg-neutral-primary",
      },
      {
        variant: "destructive",
        appearance: "soft",
        className: "border-danger-soft bg-danger-soft text-danger",
      },
      {
        variant: "success",
        appearance: "soft",
        className: "border-success-soft bg-success-soft text-success",
      },
      {
        variant: "info",
        appearance: "soft",
        className: "border-info-soft bg-info-soft text-info",
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
