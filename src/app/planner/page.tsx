import type { Metadata } from "next";

import { TopBar } from "@/components/top-bar";

export const metadata: Metadata = { title: "Planner" };

export default function PlannerPage() {
  return (
    <div className="flex h-dvh flex-col">
      <TopBar active="planner" />
      <main className="flex flex-1 items-center justify-center">
        <p className="text-neutral-tertiary">Planner arrives in step 5.</p>
      </main>
    </div>
  );
}
