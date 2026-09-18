import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Temporary step-1 preview, laid out like the Figma "Components" frame.
const buttons = [
  { variant: "primary", appearance: "filled" },
  { variant: "secondary", appearance: "filled" },
  { variant: "secondary", appearance: "outline" },
  { variant: "danger", appearance: "filled" },
] as const;

const badges = [
  { variant: "primary", appearance: "filled" },
  { variant: "secondary", appearance: "filled" },
  { variant: "destructive", appearance: "filled" },
  { variant: "success", appearance: "filled" },
  { variant: "info", appearance: "filled" },
  { variant: "warning", appearance: "filled" },
  { variant: "secondary", appearance: "outline" },
] as const;

export default function Home() {
  return (
    <main className="flex flex-col gap-8 p-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-medium">Button</h1>
        <p className="text-neutral-secondary">
          Hover and press for states. Tab for the focus ring. Bottom row is
          disabled.
        </p>
        <div className="flex gap-2">
          {buttons.map((b) => (
            <Button key={`${b.variant}-${b.appearance}`} {...b}>
              Button
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {buttons.map((b) => (
            <Button key={`${b.variant}-${b.appearance}`} {...b} disabled>
              Button
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Badge</h2>
        <div className="flex gap-2">
          {badges.map((b) => (
            <Badge key={`${b.variant}-${b.appearance}`} {...b}>
              Badge
            </Badge>
          ))}
        </div>
      </section>
    </main>
  );
}
