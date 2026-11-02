import type { StaticImageData } from "next/image";

import drivewayAfter from "@/photos/driveway-after.webp";
import drivewayBefore from "@/photos/driveway-before.webp";
import fenceCleanAfter from "@/photos/fence-clean-after.webp";
import fenceCleanBefore from "@/photos/fence-clean-before.webp";
import houseSideAfter from "@/photos/house-side-after.webp";
import houseSideBefore from "@/photos/house-side-before.webp";
import houseWashAfter from "@/photos/house-wash-after.webp";
import houseWashBefore from "@/photos/house-wash-before.webp";

/**
 * Switches for content that depends on assets we do not have yet.
 *
 * The hard rule behind all of this (CLAUDE.md, SPEC §2): real photos of our
 * own work only. No stock before/afters, no borrowed reviews. A service with
 * no real pair yet (gutters, windows, gutter guard) shows a visible
 * placeholder instead of a fake one.
 */

/**
 * Per-image framing tweak, so a before and after shot from slightly different
 * positions still line up under the wipe.
 *
 * A slider only works if the two frames match. When they do not, scale the
 * wider shot up and anchor it to the side with the spare margin - it crops
 * off-screen and sits underneath, so the size difference never shows at the
 * wipe line. Fixed points (a mailbox, a downpipe, a window edge) are what you
 * align against.
 */
export type ImageAdjust = {
  /** CSS object-position, e.g. "70% 50%" - which part survives the crop. */
  position?: string;
  /** Zoom, e.g. 1.08. Anchored by `origin`. */
  scale?: number;
  /** CSS transform-origin for the scale, e.g. "right center". */
  origin?: string;
};

/**
 * A static import (the job photos) or a plain URL (Supabase Storage, once
 * admin-uploaded photos land).
 *
 * Prefer the import. next/image hashes it into /_next/static/media, which is
 * the only thing the Workers image handler treats as immutable - a string path
 * under public/ comes back with no Cache-Control at all and is re-downloaded
 * on every visit. The import also carries its own dimensions and blur
 * placeholder.
 */
export type ImageSource = string | StaticImageData;

export type BeforeAfterPair = {
  /** The service this job shows. */
  service?: PhotoService;
  before: ImageSource;
  after: ImageSource;
  /** What the photo actually shows - used as alt text. */
  alt: string;
  /** Where the job was, e.g. "Pelican Waters". Proof it is local. */
  suburb?: string;
  /** True for layout stand-ins, so the caption never claims it is our work. */
  placeholder?: boolean;
  /** Framing corrections applied per side. Omit when the shots already match. */
  adjust?: { before?: ImageAdjust; after?: ImageAdjust };
};

/**
 * Fills every photo slot with a stamped placeholder so the layout can be
 * judged before real work exists. Generate them with `npm run placeholders`.
 * Keep false on the live site - only real photos of our own work ship.
 */
export const USE_PLACEHOLDER_MEDIA = false;

/** Which service a photo pair proves. Slots with no pair show a placeholder. */
export type PhotoService = "house-wash" | "driveway" | "gutter-clean" | "windows" | "fences" | "gutter-guard";

/**
 * Real jobs, real photos. Sources live in photos-src/ (not committed - they
 * are 2-5MB each); `npm run photos` downscales them, re-encodes to WebP and
 * crops each pair to its common frame so the wipe never makes the house jump.
 *
 * Every pair names its suburb. For a local trade that word does more work than
 * any claim we can write. All four are Buderim - big shaded blocks under gum
 * canopy, which is exactly the mould story that suburb page already tells, and
 * why the first jobs landed there. Worth spreading across the corridor as
 * Caloundra and Kawana jobs come in, so the proof strip is not one suburb
 * vouching for the whole service area.
 */
const REAL_PAIRS: readonly BeforeAfterPair[] = [
  {
    before: houseWashBefore,
    after: houseWashAfter,
    alt: "House exterior, before and after a soft wash",
    suburb: "Buderim",
    service: "house-wash",
  },
  {
    before: drivewayBefore,
    after: drivewayAfter,
    alt: "Driveway, before and after a surface clean",
    suburb: "Buderim",
    service: "driveway",
  },
  {
    before: houseSideBefore,
    after: houseSideAfter,
    alt: "The shaded side of a house, before and after a soft wash",
    suburb: "Buderim",
    service: "house-wash",
  },
  {
    before: fenceCleanBefore,
    after: fenceCleanAfter,
    alt: "Fence, before and after a clean",
    suburb: "Buderim",
    service: "fences",
  },
];

const PLACEHOLDER_PAIRS: readonly BeforeAfterPair[] = [
  {
    before: "/placeholder/driveway-before.png",
    after: "/placeholder/driveway-after.png",
    alt: "Placeholder for a driveway before and after",
    suburb: "Placeholder",
    service: "driveway",
    placeholder: true,
  },
  {
    before: "/placeholder/house-before.png",
    after: "/placeholder/house-after.png",
    alt: "Placeholder for a house wall before and after",
    suburb: "Placeholder",
    service: "house-wash",
    placeholder: true,
  },
];

const PAIRS = USE_PLACEHOLDER_MEDIA ? PLACEHOLDER_PAIRS : REAL_PAIRS;

/**
 * "Recent work" slots, one per service, in the order the site sells them.
 * Add a real pair to REAL_PAIRS with its `service` and it replaces the
 * placeholder for that slot automatically - no component changes.
 */
export const PHOTO_SLOTS: readonly { service: PhotoService; label: string }[] = [
  { service: "house-wash", label: "House soft wash" },
  { service: "driveway", label: "Driveway and paths" },
  { service: "gutter-clean", label: "Gutter clean" },
  { service: "windows", label: "Exterior windows" },
  { service: "fences", label: "Fences" },
  { service: "gutter-guard", label: "Gutter guard" },
];

export function pairsFor(service: PhotoService): BeforeAfterPair[] {
  return PAIRS.filter((p) => p.service === service);
}

export type Review = {
  quote: string;
  author: string;
  suburb: string;
};

/** Real reviews only, pasted in as they land. Empty = placeholder shows. */
export const reviews: readonly Review[] = [];
