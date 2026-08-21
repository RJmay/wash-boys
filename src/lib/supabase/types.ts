/**
 * Database types for the schema in supabase/migrations/0001_init.sql
 * (canonical shape: SPEC §6).
 *
 * Hand-written so the app is typed before the Supabase project exists. Once it
 * does, regenerate and replace this file wholesale:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 *
 * If you edit the migration, edit this file in the same commit.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Columns with a DB default or a nullable definition are optional on insert. */
type Insertable<Row, Optional extends keyof Row> = Omit<Row, Optional> &
  Partial<Pick<Row, Optional>>;

type TableDef<Row, InsertOptional extends keyof Row> = {
  Row: Row;
  Insert: Insertable<Row, InsertOptional>;
  Update: Partial<Row>;
  Relationships: [];
};

/** Funnel event types (SPEC §6). */
export type EventType =
  | "scan"
  | "land"
  | "book_start"
  | "book_done"
  | "call_tap"
  | "quote_req"
  | "lead_out_of_area";

/** Booking lifecycle (SPEC §5, §8). */
export type BookingStatus =
  | "new"
  | "confirmed"
  | "done"
  | "cancelled"
  | "no_show";

/** Half-day slots. Tue-Sat AM/PM, plus optional Sun PM overflow. */
export type Slot = "am" | "pm";

export type ServiceRow = {
  id: number;
  slug: string;
  name: string;
  from_price: number;
  price_low: number;
  price_high: number;
  description: string | null;
  active: boolean | null;
  sort: number | null;
  /** False = never selectable in the booking flow (gutters at launch). */
  bookable: boolean | null;
  /** True = greyed card that opens the waitlist instead. */
  coming_soon: boolean | null;
  /** True = quoted on site; no price rendered, excluded from estimates. */
  quote_only: boolean | null;
};

export type QrCodeRow = {
  code: string;
  campaign: string;
  suburb: string | null;
  /** Re-pointable after print - never bake a destination into a QR image. */
  destination: string;
  created_at: string;
};

export type EventRow = {
  id: number;
  ts: string;
  type: EventType;
  code: string | null;
  meta: Json | null;
};

export type BookingRow = {
  id: string;
  created_at: string;
  status: BookingStatus;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  suburb: string;
  service_slugs: string[];
  /** Size bands for services priced on size: {"patio-cleaning":{"band":"medium"}} */
  service_options: Json | null;
  bundle_discount: boolean | null;
  est_low: number | null;
  est_high: number | null;
  preferred_date: string;
  slot: Slot;
  notes: string | null;
  photo_urls: string[] | null;
  source_code: string | null;
  utm: Json | null;
};

export type AvailabilityRow = {
  day: string;
  slot: Slot;
  capacity: number;
};

/** Training data for the Phase-2 quote engine. Logged after every job. */
export type JobRow = {
  id: string;
  booking_id: string | null;
  done_at: string;
  address: string;
  suburb: string;
  service_slugs: string[];
  quoted_low: number | null;
  quoted_high: number | null;
  final_price: number;
  duration_mins: number;
  crew_size: number | null;
  /** {driveway_m2, gutter_lm, house_storeys, cladding, condition_1to5} */
  surfaces: Json | null;
  photo_urls: string[] | null;
  notes: string | null;
};

export type QuoteRequestRow = {
  id: string;
  created_at: string;
  name: string | null;
  phone: string;
  suburb: string | null;
  description: string | null;
  photo_urls: string[] | null;
  source_code: string | null;
  status: string | null;
};

/** Where a lead came from, and how far along it is. */
export type LeadKind = "out_of_area" | "general";
export type LeadStatus = "new" | "called" | "converted" | "dead";

/**
 * Contactable people who are not bookings: the out-of-area catch from booking
 * step 2, and any other "call me" capture. Separate from `events` so customer
 * PII lives in a table the owner can work through and clear down.
 */
export type LeadRow = {
  id: string;
  created_at: string;
  kind: LeadKind;
  name: string | null;
  phone: string;
  /** Free text - out-of-area leads are by definition off the suburb list. */
  suburb: string | null;
  message: string | null;
  source_code: string | null;
  status: LeadStatus;
  notes: string | null;
};

export type ServiceWaitlistRow = {
  id: string;
  created_at: string;
  service_slug: string;
  name: string | null;
  phone: string;
  suburb: string | null;
  source_code: string | null;
  notified: boolean | null;
};

export type Database = {
  public: {
    Tables: {
      services: TableDef<
        ServiceRow,
        | "id"
        | "description"
        | "active"
        | "sort"
        | "bookable"
        | "coming_soon"
        | "quote_only"
      >;
      qr_codes: TableDef<QrCodeRow, "suburb" | "destination" | "created_at">;
      events: TableDef<EventRow, "id" | "ts" | "code" | "meta">;
      bookings: TableDef<
        BookingRow,
        | "id"
        | "created_at"
        | "status"
        | "email"
        | "service_options"
        | "bundle_discount"
        | "est_low"
        | "est_high"
        | "notes"
        | "photo_urls"
        | "source_code"
        | "utm"
      >;
      availability: TableDef<AvailabilityRow, "capacity">;
      jobs: TableDef<
        JobRow,
        | "id"
        | "booking_id"
        | "quoted_low"
        | "quoted_high"
        | "crew_size"
        | "surfaces"
        | "photo_urls"
        | "notes"
      >;
      quote_requests: TableDef<
        QuoteRequestRow,
        | "id"
        | "created_at"
        | "name"
        | "suburb"
        | "description"
        | "photo_urls"
        | "source_code"
        | "status"
      >;
      leads: TableDef<
        LeadRow,
        | "id"
        | "created_at"
        | "kind"
        | "name"
        | "suburb"
        | "message"
        | "source_code"
        | "status"
        | "notes"
      >;
      service_waitlist: TableDef<
        ServiceWaitlistRow,
        | "id"
        | "created_at"
        | "service_slug"
        | "name"
        | "suburb"
        | "source_code"
        | "notified"
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
