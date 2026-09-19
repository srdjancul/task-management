"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

// Finance-app dropdown (node 2001:591): input-style trigger; solid dark
// menu with a check on the selected item.
function Select({
  options,
  placeholder,
  className,
  ref,
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  ref?: React.Ref<HTMLButtonElement>;
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <SelectPrimitive.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        ref={ref}
        id={id}
        aria-label={ariaLabel}
        data-slot="select"
        className={cn(
          "glass-input flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-base px-3 text-sm text-neutral-primary outline-none transition-colors",
          "hover:border-neutral-primary-hovered",
          "focus-visible:border-brand",
          "disabled:pointer-events-none disabled:border-neutral-primary-disabled disabled:text-neutral-primary-disabled",
          "data-[placeholder]:text-neutral-faint",
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-neutral-tertiary" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-[var(--radix-select-trigger-width)] rounded-base border border-neutral-secondary bg-neutral-primary-hovered p-1 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-2 text-sm text-neutral-secondary outline-none select-none",
                  "data-[highlighted]:bg-neutral-secondary data-[highlighted]:text-neutral-primary",
                  "data-[state=checked]:text-neutral-primary",
                )}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
