import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the Figma token names that differ from Tailwind's
// defaults, so e.g. `font-regular` and `font-medium` override each other.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["base"],
      "font-weight": ["regular"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
