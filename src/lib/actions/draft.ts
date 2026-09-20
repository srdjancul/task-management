"use server";

import Anthropic from "@anthropic-ai/sdk";

import { STATUS_LABELS } from "@/lib/contact-constants";
import { createClient } from "@/lib/supabase/server";

const SYSTEM = `You draft outreach messages for Srdjan, a UI/UX & product
designer reaching out about work (jobs, contracts, collaborations). His
profile follows in the user message.

Rules:
- Write in English.
- First touch: under 110 words. Follow-up: under 70 words.
- Sound like a person, not a template. No "I hope this finds you well",
  no buzzwords, no flattery padding.
- Reference something concrete about the recipient (their role, company,
  or note) and, when it fits, ONE relevant project of Srdjan's.
- One clear, low-friction ask at the end (a look at his work, a short
  call, or a reply).
- For follow-ups, acknowledge the earlier message naturally — never
  guilt-trip.
- Sign off with "Srdjan".

Output EXACTLY two message variants separated by a line containing only
"---". Variant 1: short and direct. Variant 2: a different angle, a
touch warmer. No headings, no commentary — just the two messages.`;

export type DraftResult = { drafts: string[]; error: string | null };

// Draft two outreach messages for a contact, using the owner's profile
// and the contact's full touch history. Auth: RLS scopes every read to
// the signed-in owner; no data, no draft.
export async function draftOutreach(contactId: string): Promise<DraftResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      drafts: [],
      error:
        "ANTHROPIC_API_KEY is not set. Add it to .env.local (and Vercel), then restart.",
    };
  }

  const supabase = await createClient();

  const [{ data: contact }, { data: touches }, { data: profileRow }] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", contactId).maybeSingle(),
      supabase
        .from("touches")
        .select("happened_at, channel, direction, note")
        .eq("contact_id", contactId)
        .order("happened_at", { ascending: true }),
      supabase
        .from("settings")
        .select("value")
        .eq("key", "outreach_profile")
        .maybeSingle(),
    ]);

  if (!contact) return { drafts: [], error: "Contact not found." };

  const profile = profileRow?.value.trim();
  if (!profile) {
    return {
      drafts: [],
      error:
        "Your outreach profile is empty — open Profile in the top bar and paste it first.",
    };
  }

  const history =
    touches && touches.length > 0
      ? touches
          .map(
            (t) =>
              `- ${t.happened_at.slice(0, 10)} · ${t.channel} · ${t.direction}${t.note ? ` · ${t.note}` : ""}`,
          )
          .join("\n")
      : "(no previous touches — this is the first message)";

  const context = `SRDJAN'S PROFILE:
${profile}

RECIPIENT:
- Name: ${contact.first_name} ${contact.last_name}
- Role: ${contact.position || "unknown"}
- Company: ${contact.company || "unknown"}
- Company note: ${contact.company_note || "none"}
- Approach: ${contact.approach === "applied" ? "Srdjan applied to a job at this company" : "direct outreach"}
- Pipeline status: ${STATUS_LABELS[contact.status]}

TOUCH HISTORY (oldest first):
${history}

Draft the two variants now.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: context }],
    });

    if (response.stop_reason === "refusal") {
      return { drafts: [], error: "The model declined this request." };
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) return { drafts: [], error: "Empty response — try again." };

    const drafts = text
      .split(/\n-{3,}\n/)
      .map((d) => d.trim())
      .filter(Boolean)
      .slice(0, 3);

    return { drafts, error: null };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { drafts: [], error: "Invalid ANTHROPIC_API_KEY." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { drafts: [], error: "Rate limited — try again in a minute." };
    }
    console.error("draftOutreach failed:", err);
    return { drafts: [], error: "Drafting failed — try again." };
  }
}
