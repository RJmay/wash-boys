import { BUSINESS } from "@/data/business";
import { getService, type ServiceSlug } from "@/data/services";
import { suburbsInRegion, type Suburb } from "@/data/suburbs";

/**
 * Copy for the suburb pages (SPEC §9).
 *
 * Twenty-eight pages that say the same thing in different fonts is a doorway
 * network, and it deserves to rank nowhere. So the emphasis on each page is
 * derived from that suburb's own hook: the salt-air suburbs lead with render
 * and walls, the tree-shaded ones lead with mould and moss, the new estates
 * lead with dust on pale concrete.
 *
 * The hooks were written per suburb from what actually dirties houses there,
 * so this stays specific rather than spun. If a page here ever reads like it
 * could be about anywhere, the hook is the thing to fix.
 */

type Angle = {
  match: RegExp;
  /** Services this condition drives, most relevant first. */
  services: ServiceSlug[];
  /** One sentence on what the condition does to a house. */
  because: string;
};

const ANGLES: Angle[] = [
  {
    match: /salt|beach|dune|passage|canal|sea mist|spray/i,
    services: ["house-washing", "driveway-cleaning"],
    because:
      "Salt does not wash off in the rain. It sits on render and paintwork, holds moisture against the surface, and gives mould somewhere to take hold.",
  },
  {
    match: /mould|moss|shade|tree|damp|green|humid|lichen/i,
    services: ["house-washing", "patio-cleaning"],
    because:
      "Anything the sun does not reach stays damp, and damp is what mould and moss need. It comes back faster on the shaded side of a house than most people expect.",
  },
  {
    match: /driveway|aggregate|concrete|red dirt|tyre|oil|path/i,
    services: ["driveway-cleaning", "patio-cleaning"],
    because:
      "Concrete is porous. Red dirt, oil and tyre rubber work into the surface rather than sitting on it, which is why hosing never quite does the job.",
  },
  {
    match: /fence|retaining/i,
    services: ["fence-cleaning", "house-washing"],
    because:
      "Fences and retaining walls go green from the ground up, and they are usually the first thing you see from the street.",
  },
  {
    match: /gutter/i,
    services: ["house-washing"],
    because:
      "Gutters fill fastest under tree cover. We are not cleaning them yet, but the waitlist is open and it goes live before storm season.",
  },
  {
    match: /dust|new build|render|estate|construction/i,
    services: ["driveway-cleaning", "house-washing"],
    because:
      "New builds start clean and mark fast. Pale driveways and fresh render show construction dust and red dirt within a season.",
  },
];

export type AreaCopy = {
  intro: string;
  because: string[];
  logistics: string;
  services: ServiceSlug[];
  neighbours: Suburb[];
};

export function areaCopy(suburb: Suburb): AreaCopy {
  const matched = ANGLES.filter((a) => a.match.test(suburb.hook));
  // Every suburb gets a driveway and a house wash at minimum - they are the
  // two most people actually want - but the order follows the hook.
  const ordered = [
    ...new Set([
      ...matched.flatMap((a) => a.services),
      "driveway-cleaning" as const,
      "house-washing" as const,
      "patio-cleaning" as const,
      "fence-cleaning" as const,
    ]),
  ];

  const neighbours = suburbsInRegion(suburb.region)
    .filter((s) => s.slug !== suburb.slug)
    .slice(0, 5);

  const isBase = suburb.slug === "aroona";
  const logistics = isBase
    ? `We are based here, so ${suburb.name} jobs are the easiest run we do — and the ones we can usually fit in at short notice.`
    : `We run out of ${BUSINESS.base.suburb}, so ${suburb.name} is a short trip rather than a call-out. That matters for the smaller jobs: a patio or a fence on its own is only worth doing when the travel is not the expensive part.${
        neighbours.length
          ? ` We are often in ${neighbours
              .slice(0, 2)
              .map((n) => n.name)
              .join(" and ")} the same week.`
          : ""
      }`;

  /*
    Always at least two angles. One matched angle leaves a page thin enough
    that Google treats it as boilerplate, and the concrete angle is honest
    filler because every property in the corridor has a driveway or a path.
  */
  const CONCRETE = ANGLES[2];
  const because =
    matched.length >= 2
      ? matched.map((a) => a.because)
      : matched.length === 1
        ? [
            matched[0].because,
            ...(matched[0] === CONCRETE ? [ANGLES[1].because] : [CONCRETE.because]),
          ]
        : [CONCRETE.because, ANGLES[1].because];

  return {
    intro: suburb.hook,
    because,
    logistics,
    services: ordered.slice(0, 4),
    neighbours,
  };
}

/** Rough word count, so a thin page is caught in a test rather than by Google. */
export function areaWordCount(suburb: Suburb): number {
  const copy = areaCopy(suburb);
  const service = copy.services
    .map((slug) => getService(slug)?.blurb ?? "")
    .join(" ");
  return [copy.intro, ...copy.because, copy.logistics, service]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}
