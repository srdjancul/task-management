import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  APPROACHES,
  type ContactApproach,
  type ContactFields,
} from "@/lib/contact-constants";

// Shared field set for quick add and the panel's edit form. The parent
// <form> owns submit; values are read back with readContactFields.
export function ContactFormFields({
  defaults,
  idPrefix,
}: {
  defaults?: Partial<ContactFields>;
  idPrefix: string;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("first_name")}>First name</Label>
          <Input
            id={id("first_name")}
            name="first_name"
            defaultValue={defaults?.first_name}
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("last_name")}>Last name</Label>
          <Input
            id={id("last_name")}
            name="last_name"
            defaultValue={defaults?.last_name}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("position")}>Position</Label>
          <Input
            id={id("position")}
            name="position"
            defaultValue={defaults?.position}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("company")}>Company</Label>
          <Input
            id={id("company")}
            name="company"
            defaultValue={defaults?.company}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("approach")}>Approach</Label>
          <Select
            id={id("approach")}
            name="approach"
            defaultValue={defaults?.approach ?? "direct"}
          >
            {APPROACHES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("source_url")}>Source URL</Label>
          <Input
            id={id("source_url")}
            name="source_url"
            type="url"
            placeholder="https://…"
            defaultValue={defaults?.source_url ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={id("company_note")}>Company note</Label>
        <Textarea
          id={id("company_note")}
          name="company_note"
          rows={2}
          defaultValue={defaults?.company_note}
        />
      </div>
    </div>
  );
}

export function readContactFields(formData: FormData): ContactFields {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const approach = text("approach") as ContactApproach;

  return {
    first_name: text("first_name"),
    last_name: text("last_name"),
    position: text("position"),
    company: text("company"),
    company_note: text("company_note"),
    approach: APPROACHES.includes(approach) ? approach : "direct",
    source_url: text("source_url") || null,
  };
}
