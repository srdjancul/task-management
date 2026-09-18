"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-lg font-medium">Something went wrong</h1>
      <p className="max-w-panel text-center text-neutral-secondary">
        The error was logged. Try again — if it keeps happening, reload the
        page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
