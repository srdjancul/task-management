import type { Database } from "@/lib/supabase/database.types";

export type ContactStatus = Database["public"]["Enums"]["contact_status"];
export type ContactApproach = Database["public"]["Enums"]["contact_approach"];
export type TouchChannel = Database["public"]["Enums"]["touch_channel"];
export type TouchDirection = Database["public"]["Enums"]["touch_direction"];

export type ContactTouch = Database["public"]["Tables"]["touches"]["Row"];

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

export const APPROACHES = [
  "direct",
  "applied",
] as const satisfies readonly ContactApproach[];

export const TOUCH_CHANNELS = [
  "email",
  "linkedin",
  "both",
] as const satisfies readonly TouchChannel[];

export const TOUCH_DIRECTIONS = [
  "sent",
  "received",
] as const satisfies readonly TouchDirection[];

// The user-editable fields of a contact (quick add + edit form).
export type ContactFields = {
  first_name: string;
  last_name: string;
  position: string;
  company: string;
  company_note: string;
  approach: ContactApproach;
  source_url: string | null;
};

// Shape the board works with: a contact row from contacts_with_activity,
// touch stats included (always derived, never stored).
export type BoardContact = ContactFields & {
  id: string;
  status: ContactStatus;
  board_rank: number;
  created_at: string;
  touch_count: number;
  last_touch_at: string | null;
};
