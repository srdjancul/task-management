import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-lg font-medium">Page not found</h1>
      <p className="text-neutral-secondary">
        Nothing lives at this address.
      </p>
      <Link href="/" className={buttonVariants({ variant: "secondary" })}>
        Back to the board
      </Link>
    </main>
  );
}
