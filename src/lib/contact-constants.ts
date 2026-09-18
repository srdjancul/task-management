import type { Database } from "@/lib/supabase/database.types";

export type ContactStatus = Database["public"]["Enums"]["contact_status"];
export type ContactApproach = Database["public"]["Enums"]["contact_approach"];

export const CONTACT_STATUSES = [
  "to_contact",
  "contacted",
  "followed_up",
  "replied",
  "in_conversation",
  "interview",
  "won",
  "rejected",
  "ghosted",
] as const satisfies readonly ContactStatus[];

export const STATUS_LABELS: Record<ContactStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  followed_up: "Followed up",
  replied: "Replied",
  in_conversation: "In conversation",
  interview: "Interview",
  won: "Won",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

// Shape the board works with: a contact row from contacts_with_activity,
// touch stats included (always derived, never stored).
export type BoardContact = {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  company: string;
  approach: ContactApproach;
  status: ContactStatus;
  board_rank: number;
  touch_count: number;
  last_touch_at: string | null;
};
