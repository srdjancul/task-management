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
    "rounded-base border border-transparent font-medium outline-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:border-transparent disabled:text-neutral-primary-disabled",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-brand-primary text-neutral-inverse",
          "hover:bg-brand-primary-hovered active:bg-brand-primary-pressed",
          "disabled:bg-brand-primary-disabled",
        ],
        secondary: "text-neutral-primary",
        danger: [
          "bg-danger text-neutral-inverse",
          "hover:bg-danger-hovered active:bg-danger-pressed",
          "disabled:bg-brand-primary-disabled",
        ],
      },
      appearance: {
        filled: "",
        outline: "",
      },
      size: {
        sm: "h-8 gap-2 px-3 text-sm",
        icon: "size-8",
      },
    },
    compoundVariants: [
      {
        variant: "secondary",
        appearance: "filled",
        className: [
          "border-neutral-secondary bg-neutral-secondary",
          "hover:border-transparent hover:bg-neutral-secondary-hovered",
          "active:bg-neutral-secondary-pressed",
          "disabled:bg-neutral-tertiary",
        ],
      },
      {
        variant: "secondary",
        appearance: "outline",
        className: [
          "border-neutral-primary bg-neutral-primary",
          "hover:border-transparent hover:bg-neutral-primary-hovered",
          "active:bg-neutral-primary-pressed",
          "disabled:bg-neutral-primary-disabled",
        ],
      },
    ],
    defaultVariants: {
      variant: "primary",
      appearance: "filled",
      size: "sm",
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
