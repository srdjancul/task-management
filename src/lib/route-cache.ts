"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PrefetchOptions } from "next/dist/shared/lib/app-router-context.shared-runtime";

/*
 * Instant page switches (owner complaint 2026-10-01: ~1s wait per click).
 *
 * Every page here is dynamic (cookies + live data) and has no loading.js,
 * so a default router.prefetch() / <Link> prefetch fetches nothing useful
 * and each click waits for a server render. A "full" prefetch renders the
 * target page ahead of time, so the click needs no server trip.
 *
 * The catch is freshness: a prefetched page is a snapshot. Every write
 * goes through trackWrite, which marks the snapshots stale; the next page
 * that warms routes then calls router.refresh(), which drops every
 * snapshot and re-warms them through onInvalidate — so you never land on a
 * pre-edit view.
 */

const FULL = "full" as PrefetchOptions["kind"];

let stale = false;

// Wrap every server-action write. Stale on start AND on settle: a snapshot
// taken while the write was in flight may predate it.
export async function trackWrite<T>(write: Promise<T>): Promise<T> {
  stale = true;
  try {
    return await write;
  } finally {
    stale = true;
  }
}

export function useWarmRoutes(hrefs: string[]) {
  const router = useRouter();
  // Effect deps want a stable primitive, not a fresh array each render.
  const key = hrefs.join("\n");

  React.useEffect(() => {
    if (stale) {
      stale = false;
      // Re-renders the current page (cheap) and invalidates every cached
      // snapshot; the onInvalidate below re-warms them.
      router.refresh();
    }
    let cancelled = false;
    const warm = (href: string) => {
      if (cancelled) return;
      router.prefetch(href, { kind: FULL, onInvalidate: () => warm(href) });
    };
    const warmAll = () => key.split("\n").forEach(warm);
    warmAll();
    // Snapshots expire after 5 minutes and this app stays open all day.
    // Re-asking is free while a snapshot is fresh; once expired it re-warms.
    const timer = setInterval(warmAll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [router, key]);
}
