import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Skeleton from shadcn/ui (radix-nova), restyled to the Figma "button"
// component (node 14005:1860): variant × appearance × state, size sm.
// Every visual value comes from the tokens in globals.css.
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap select-none",
    "rounded-base border border-transparent font-medium outline-none transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:border-transparent disabled:text-neutral-primary-disabled",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: [
          // Owner spec: primary actions are white with black ink.
          "bg-neutral-inverse text-neutral-inverse",
          "hover:bg-neutral-inverse-hovered active:bg-neutral-inverse-pressed",
          "disabled:bg-brand-primary-disabled disabled:text-neutral-primary-disabled",
        ],
        secondary: "text-neutral-primary",
        // App-level: quiet chrome buttons (panel close, edit, row actions).
        ghost: [
          "bg-transparent text-neutral-secondary",
          "hover:bg-neutral-secondary hover:text-neutral-primary",
          "active:bg-neutral-secondary-pressed",
        ],
        // Completed state (e.g. "Done"): cyan soft — 10% fill + stroke.
        success: [
          "border-success-soft bg-success-soft text-success",
          "hover:bg-brand-secondary",
          "active:bg-brand-secondary-hovered",
        ],
        danger: [
          "bg-danger text-neutral-primary",
          "hover:bg-danger-hovered active:bg-danger-pressed",
          "disabled:bg-brand-primary-disabled",
        ],
      },
      appearance: {
        filled: "",
        outline: "",
      },
      size: {
        // Same height as inputs (h-10): adjacent controls match exactly.
        md: "h-10 gap-2 px-3 text-sm",
        sm: "h-8 gap-2 px-3 text-sm",
        icon: "size-8",
        "icon-sm": "size-6",
      },
    },
    compoundVariants: [
      // Owner spec: secondary buttons keep their white/10 stroke on hover.
      {
        variant: "secondary",
        appearance: "filled",
        className: [
          "border-neutral-secondary bg-neutral-secondary",
          "hover:bg-neutral-secondary-hovered",
          "active:bg-neutral-secondary-pressed",
          "disabled:bg-neutral-tertiary",
        ],
      },
      {
        variant: "secondary",
        appearance: "outline",
        className: [
          "border-neutral-secondary bg-transparent",
          "hover:bg-neutral-secondary",
          "active:bg-neutral-secondary-pressed",
          "disabled:bg-transparent disabled:border-neutral-primary-disabled",
        ],
      },
    ],
    defaultVariants: {
      variant: "primary",
      appearance: "filled",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  appearance,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      className={cn(buttonVariants({ variant, appearance, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
