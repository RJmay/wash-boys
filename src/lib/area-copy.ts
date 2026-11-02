import { BUSINESS } from "@/data/business";
import { suburbIntro, suburbsInRegion, type Suburb } from "@/data/suburbs";

/**
 * Copy for the suburb pages.
 *
 * Thirty pages that say the same thing in different fonts is a doorway
 * network, and it deserves to rank nowhere. So each page leads with that
 * suburb's own words - the owner's blurb from service-areas.json where there
 * is one, else the hook in suburbs.ts - and the "what we see" paragraphs are
 * picked from what the text says actually dirties houses there.
 */

type Angle = { match: RegExp; because: string };

const ANGLES: Angle[] = [
  {
    match: /salt|beach|dune|passage|canal|sea mist|spray/i,
    because:
      "Salt does not wash off in the rain. It sits on render, paintwork and glass, holds moisture against the surface and gives mould somewhere to take hold. A soft wash and a window clean lift it without damaging paint.",
  },
  {
    match: /mould|moss|shade|tree|damp|green|humid|lichen|leafy/i,
    because:
      "Anything the sun does not reach stays damp, and damp is what mould needs. A soft wash kills it at the root rather than blasting the top off, so the clean lasts longer.",
  },
  {
    match: /gutter|leaf|leaves|bush|scrub|canopy/i,
    because:
      "Trees mean leaves, and leaves mean gutters that fill fast. We clear them by hand, bag the debris and flush the downpipes - or fit gutter guard so you never have to think about it again.",
  },
  {
    match: /fence|retaining/i,
    because:
      "Fences and retaining walls go green from the ground up, and they're usually the first thing you see from the street. Add them to a house wash while we're already there.",
  },
  {
    match: /driveway|aggregate|concrete|red dirt|tyre|oil|path|dust/i,
    because:
      "Concrete is porous. Red dirt, oil and tyre marks work into the surface rather than sitting on it, which is why hosing never quite does it. A rotary surface cleaner gives an even finish with no stripes.",
  },
];

/** Used when the text matches fewer than two angles, so no page is thin. */
const FALLBACKS = [ANGLES[4], ANGLES[2]];

export type AreaCopy = {
  intro: string;
  /** The hook, when the page leads with the blurb instead. */
  local?: string;
  because: string[];
  logistics: string;
  neighbours: Suburb[];
};

export function areaCopy(suburb: Suburb): AreaCopy {
  const text = `${suburb.blurb ?? ""} ${suburb.hook ?? ""}`;
  const matched = ANGLES.filter((a) => a.match.test(text));
  const angles = [...new Set([...matched, ...FALLBACKS])].slice(0, 2);

  const neighbours = suburbsInRegion(suburb.region)
    .filter((s) => s.slug !== suburb.slug)
    .slice(0, 5);

  const isBase = suburb.slug === BUSINESS.base.suburb.toLowerCase();
  const logistics = isBase
    ? `We're based in ${suburb.name}, so your street is minutes away.`
    : `We book whole streets in ${suburb.name} on the same days, so there's no travel cost to pass on and no call-out fee.${
        neighbours.length
          ? ` We're often in ${neighbours
              .slice(0, 2)
              .map((n) => n.name)
              .join(" and ")} the same week.`
          : ""
      }`;

  return {
    intro: suburbIntro(suburb),
    local: suburb.blurb && suburb.hook ? suburb.hook : undefined,
    because: angles.map((a) => a.because),
    logistics,
    neighbours,
  };
}
