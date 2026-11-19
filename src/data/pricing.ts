import raw from "./pricing.json";

/**
 * Typed view of pricing.json - the one place every price on the site comes
 * from. Change a number in the JSON and the home page, pricing table, service
 * pages, suburb pages, booking form, emails and structured data all follow.
 *
 * All prices include GST and are for a single-storey home (`basis`).
 * Double-storey surcharges are added on top, never baked in.
 */

export type ServiceId = "house-wash" | "driveway" | "gutter-clean" | "windows" | "fences";
export type GutterGuardId =
  | "gutter-guard-small"
  | "gutter-guard-medium"
  | "gutter-guard-large";
export type BundleId = "exterior-refresh" | "full-exterior" | "annual-refresh";

/** Driveway sizes, counted in cars. "bigger" is past the largest listed size. */
export const DRIVEWAY_SIZES = ["1-2-cars", "3-cars", "4-cars", "bigger"] as const;
export type DrivewaySize = (typeof DRIVEWAY_SIZES)[number];

/** A driveway size as pricing.json lists it: an area, not a price. */
type DrivewaySizeRaw = {
  id: Exclude<DrivewaySize, "bigger">;
  /** Most cars this size fits. */
  cars: number;
  name: string;
  /** How the cars sit, e.g. "two wide, two long". */
  detail?: string;
  /** Driveway, council crossover and front path together. */
  area_m2: number;
};

/** A driveway size with its price, worked out from the area. */
export type DrivewaySizeOption = DrivewaySizeRaw & { price: number };

export type PricedService = {
  id: ServiceId;
  name: string;
  price: number;
  description: string;
  /** Area the price covers, and the rate past it (driveway). */
  includedArea_m2?: number;
  extraPerM2?: number;
  /** Priced by size (driveway). `price` is the smallest size. */
  sizes?: DrivewaySizeRaw[];
  /** What happens past the largest size. */
  overMaxNote?: string;
  /** True when `price` is a starting price, confirmed by phone (fences). */
  from?: boolean;
  /** How a "from" price scales, e.g. "per metre, per side". */
  pricedBy?: string;
  /** Can be added on top of a bundle or gutter guard booking. */
  addOn?: boolean;
};

export type Bundle = {
  id: BundleId;
  name: string;
  price: number;
  separatePrice?: number;
  saving?: number;
  includes: (ServiceId | GutterGuardId)[];
  headline?: boolean;
  billing?: string;
  note?: string;
};

export type GutterGuardPackage = {
  id: GutterGuardId;
  name: string;
  minMetres?: number;
  maxMetres: number;
  price: number;
};

type PricingFile = {
  currency: string;
  gstIncluded: boolean;
  basis: string;
  deposits: { cleaning: number; gutterGuard: number };
  bundles: Bundle[];
  services: PricedService[];
  gutterGuard: {
    includesGutterClean: boolean;
    packages: GutterGuardPackage[];
    valleyEach: number;
    overMaxNote: string;
  };
  surcharges: {
    doubleStorey: { washingAndWindows: number; gutterGuard: number };
  };
};

export const PRICING = raw as PricingFile;

export const SERVICES_PRICED = PRICING.services;
export const BUNDLES = PRICING.bundles;
export const GUTTER_GUARD = PRICING.gutterGuard;
export const DEPOSITS = PRICING.deposits;
export const DOUBLE_STOREY = PRICING.surcharges.doubleStorey;

export const SERVICE_IDS = SERVICES_PRICED.map((s) => s.id) as [
  ServiceId,
  ...ServiceId[],
];
export const GUTTER_GUARD_IDS = GUTTER_GUARD.packages.map((p) => p.id) as [
  GutterGuardId,
  ...GutterGuardId[],
];

export function getPricedService(id: string): PricedService | undefined {
  return SERVICES_PRICED.find((s) => s.id === id);
}

// ── Driveway sizes ────────────────────────────────────────────────────────

/**
 * Each size's price comes from its area at the driveway rate: the base price
 * covers `includedArea_m2`, and every m² past it is `extraPerM2`. So a size's
 * price can never drift from its square metres.
 *
 * Areas (worked out 19 Nov 2026 at the owner's request) are driveway + crossover + front
 * path. QLD lots of 450 m²+ set the garage 6 m back (QDC MP1.2); a double is
 * about 5.7 m wide; a crossover is about 4 m wide across a ~4 m verge (16 m²);
 * a front path about 7 m². That makes 2 cars ~57 m², and each car space past
 * two adds about 16 m² whatever the layout: 3 cars ~75 m² (three wide, or two
 * wide plus one behind), 4 cars ~90 m² (two wide, two long, ~11.5 m deep).
 */
function drivewayOptions(): DrivewaySizeOption[] {
  const driveway = getPricedService("driveway");
  const sizes = driveway?.sizes;
  if (!driveway || !sizes?.length) throw new Error("pricing.json: the driveway has no sizes");
  const included = driveway.includedArea_m2 ?? 0;
  const rate = driveway.extraPerM2 ?? 0;
  return sizes.map((size) => ({
    ...size,
    price: driveway.price + rate * Math.max(0, size.area_m2 - included),
  }));
}

/** 1 or 2 cars, 3 cars, 4 cars - smallest first, from pricing.json. */
export const DRIVEWAY_OPTIONS = drivewayOptions();
/** The size every bundle price includes, and the single-service price. */
export const DRIVEWAY_BASE = DRIVEWAY_OPTIONS[0];
export const DRIVEWAY_LARGEST = DRIVEWAY_OPTIONS[DRIVEWAY_OPTIONS.length - 1];
export const DRIVEWAY_OVER_MAX_NOTE = getPricedService("driveway")?.overMaxNote ?? "";

/** What a size adds on top of a bundle: "3 cars" is +$120. */
export function drivewayExtra(option: DrivewaySizeOption): number {
  return option.price - DRIVEWAY_BASE.price;
}

/** "4 cars (two wide, two long)". */
export function drivewaySizeName(option: DrivewaySizeOption): string {
  return option.detail ? `${option.name} (${option.detail})` : option.name;
}

/** "up to 60 m²" for the base size, "about 90 m²" past it. */
export function drivewayArea(option: DrivewaySizeOption): string {
  return option.id === DRIVEWAY_BASE.id
    ? `up to ${option.area_m2} m²`
    : `about ${option.area_m2} m²`;
}

/** The muted line under a size: "two wide, two long, about 90 m²". */
export function drivewayDetail(option: DrivewaySizeOption): string {
  return [option.detail, drivewayArea(option)].filter(Boolean).join(", ");
}

/** The size a booking resolves to. Not given means the base size. */
function drivewayFor(size: DrivewaySize | undefined): {
  option: DrivewaySizeOption;
  label: string;
  bigger: boolean;
} {
  if (size === "bigger") {
    return {
      option: DRIVEWAY_LARGEST,
      label: `bigger than ${DRIVEWAY_LARGEST.cars} cars`,
      bigger: true,
    };
  }
  const option = DRIVEWAY_OPTIONS.find((o) => o.id === size) ?? DRIVEWAY_BASE;
  return { option, label: option.name, bigger: false };
}

/** "3 cars", "bigger than 4 cars". */
export function drivewaySizeLabel(size: DrivewaySize): string {
  return drivewayFor(size).label;
}

/** Services offered on top of a bundle or gutter guard (fences). */
export const ADD_ONS = SERVICES_PRICED.filter((s) => s.addOn);
export const ADD_ON_IDS = ADD_ONS.map((s) => s.id);

export function getBundle(id: BundleId): Bundle {
  const bundle = BUNDLES.find((b) => b.id === id);
  if (!bundle) throw new Error(`pricing.json has no bundle "${id}"`);
  return bundle;
}

export function getGutterGuardPackage(
  id: string,
): GutterGuardPackage | undefined {
  return GUTTER_GUARD.packages.find((p) => p.id === id);
}

/** The bundle the whole site leads with ($790 Exterior Refresh). */
export const HEADLINE_BUNDLE =
  BUNDLES.find((b) => b.headline) ?? getBundle("exterior-refresh");

/** Cheapest gutter guard package, for "from $X". */
export const GUTTER_GUARD_FROM = Math.min(
  ...GUTTER_GUARD.packages.map((p) => p.price),
);

/** Largest standard package length; anything longer is quoted by phone. */
export const GUTTER_GUARD_MAX_METRES = Math.max(
  ...GUTTER_GUARD.packages.map((p) => p.maxMetres),
);

/** "Small: up to 40 m", "Medium: 40 to 70 m". */
export function packageLength(pkg: GutterGuardPackage): string {
  return pkg.minMetres === undefined
    ? `up to ${pkg.maxMetres} m`
    : `${pkg.minMetres} to ${pkg.maxMetres} m`;
}

/** Display name for anything a bundle can include. */
export function itemName(id: ServiceId | GutterGuardId): string {
  const service = getPricedService(id);
  if (service) return service.name;
  const pkg = getGutterGuardPackage(id);
  return pkg ? `${pkg.name} gutter guard, fitted` : id;
}

/** Whole dollars with thousands separators: "$1,070". */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

/** True when `price` is where the service starts, not what it costs. */
export function isFromPrice(service: PricedService): boolean {
  return Boolean(service.from) || (service.sizes?.length ?? 0) > 1;
}

/** "$450", or "from $120" for a service priced by size. */
export function servicePriceLabel(service: PricedService): string {
  return `${isFromPrice(service) ? "from " : ""}${formatPrice(service.price)}`;
}

// ── Booking selection ─────────────────────────────────────────────────────

/** What the booking form's "What would you like?" question resolves to. */
export const PACKAGE_CHOICES = [
  "exterior-refresh",
  "full-exterior",
  "gutter-guard",
  "single",
] as const;
export type PackageChoice = (typeof PACKAGE_CHOICES)[number];

export const GUTTER_GUARD_SIZES = [
  "small",
  "medium",
  "large",
  "not-sure",
] as const;
export type GutterGuardSize = (typeof GUTTER_GUARD_SIZES)[number];

export type Storeys = "single" | "double";

export type Selection = {
  package: PackageChoice;
  /** Only for package = "gutter-guard". */
  gutterGuardSize?: GutterGuardSize;
  /** Only for package = "single". */
  services?: ServiceId[];
  /** Add-ons (fences) on top of any other package. */
  addOns?: ServiceId[];
  /** Only when the job includes the driveway. Not given means 1 or 2 cars. */
  drivewaySize?: DrivewaySize;
  storeys: Storeys;
};

export type PriceLine = { label: string; amount: number };

export type Quote = {
  lines: PriceLine[];
  total: number;
  deposit: number;
  /** True when the total is a floor ("from"), e.g. gutter guard size not sure. */
  isFrom: boolean;
  /** Things only a phone call settles: valleys, a driveway past 4 cars. */
  confirmByPhone: string[];
  /** Short name for the booking, e.g. "Exterior Refresh". */
  summary: string;
  /** Every service id or package id the job covers, for the DB. */
  items: string[];
};

function gutterGuardPackageFor(size: GutterGuardSize): GutterGuardPackage {
  const id = size === "not-sure" ? "gutter-guard-medium" : `gutter-guard-${size}`;
  return getGutterGuardPackage(id) ?? GUTTER_GUARD.packages[0];
}

/** Items a selection covers, before pricing. */
function itemsFor(selection: Selection): (ServiceId | GutterGuardId)[] {
  switch (selection.package) {
    case "exterior-refresh":
      return getBundle("exterior-refresh").includes;
    case "full-exterior":
      return getBundle("full-exterior").includes;
    case "gutter-guard":
      return [gutterGuardPackageFor(selection.gutterGuardSize ?? "not-sure").id];
    case "single":
      return selection.services ?? [];
  }
}

/** Add-ons only count on non-single packages; single lists them as services. */
function addOnsFor(selection: Selection): ServiceId[] {
  if (selection.package === "single") return [];
  return (selection.addOns ?? []).filter((id) => ADD_ON_IDS.includes(id));
}

const isGutterGuard = (id: string) => id.startsWith("gutter-guard");

/**
 * Prices a booking. Used by the form for the live total and recomputed by the
 * server action, so the price saved against a booking always comes from
 * pricing.json rather than from the browser.
 *
 * The double-storey washing-and-windows surcharge is applied once per job when
 * it includes a house wash or windows - pricing.json lists it as a single
 * figure, not per service.
 */
export function quote(selection: Selection): Quote {
  const items: string[] = [...itemsFor(selection)];
  const lines: PriceLine[] = [];
  let isFrom = false;
  let summary: string;
  const driveway = drivewayFor(items.includes("driveway") ? selection.drivewaySize : undefined);
  if (items.includes("driveway") && driveway.bigger) isFrom = true;

  if (selection.package === "exterior-refresh" || selection.package === "full-exterior") {
    const bundle = getBundle(selection.package);
    lines.push({ label: bundle.name, amount: bundle.price });
    summary = bundle.name;
    // The bundle price covers the base size; a bigger driveway is the difference.
    const extra = bundle.includes.includes("driveway") ? drivewayExtra(driveway.option) : 0;
    if (extra > 0) {
      lines.push({ label: `Driveway: ${driveway.label}`, amount: extra });
    }
  } else if (selection.package === "gutter-guard") {
    const size = selection.gutterGuardSize ?? "not-sure";
    const pkg = gutterGuardPackageFor(size);
    if (size === "not-sure") {
      // Most single-storey 3-4 bedroom homes are Medium (site-content.md),
      // but the customer has not said, so quote the floor and confirm.
      const smallest = GUTTER_GUARD.packages[0];
      lines.push({ label: "Gutter guard, size to confirm", amount: smallest.price });
      isFrom = true;
      summary = "Gutter guard (size to confirm)";
    } else {
      lines.push({ label: `${pkg.name} gutter guard (${packageLength(pkg)})`, amount: pkg.price });
      summary = `${pkg.name} gutter guard`;
    }
  } else {
    for (const id of selection.services ?? []) {
      const service = getPricedService(id);
      if (!service) continue;
      lines.push(
        id === "driveway"
          ? { label: `${service.name} (${driveway.label})`, amount: driveway.option.price }
          : { label: service.name, amount: service.price },
      );
    }
    summary = lines.map((l) => l.label).join(", ") || "Single services";
  }

  const addOns = addOnsFor(selection);
  for (const id of addOns) {
    const service = getPricedService(id);
    if (service) lines.push({ label: service.name, amount: service.price });
  }
  if (addOns.length) {
    summary += ` + ${addOns.map((id) => getPricedService(id)?.name ?? id).join(", ")}`;
  }
  items.push(...addOns);

  // Any "from" service (fences) makes the whole total a floor.
  const fromServices = items
    .map((id) => getPricedService(id))
    .filter((s): s is PricedService => Boolean(s?.from));
  if (fromServices.length) isFrom = true;

  if (selection.storeys === "double") {
    if (items.some((id) => id === "house-wash" || id === "windows")) {
      lines.push({ label: "Double-storey: washing and windows", amount: DOUBLE_STOREY.washingAndWindows });
    }
    if (items.some(isGutterGuard)) {
      lines.push({ label: "Double-storey: gutter guard", amount: DOUBLE_STOREY.gutterGuard });
    }
  }

  const confirmByPhone: string[] = [];
  if (items.includes("driveway") && driveway.bigger) {
    confirmByPhone.push(DRIVEWAY_OVER_MAX_NOTE);
  }
  for (const service of fromServices) {
    confirmByPhone.push(
      `${service.name} are priced ${service.pricedBy ?? "by size"}, from ${formatPrice(service.price)}. We'll confirm by phone before the day.`,
    );
  }
  if (items.some(isGutterGuard)) {
    confirmByPhone.push(`Valleys are ${formatPrice(GUTTER_GUARD.valleyEach)} each.`);
    if (selection.package === "gutter-guard" && selection.gutterGuardSize === "not-sure") {
      confirmByPhone.push("We'll confirm your gutter length with a quick phone measure.");
    }
  }

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    deposit: items.some(isGutterGuard) ? DEPOSITS.gutterGuard : DEPOSITS.cleaning,
    isFrom,
    confirmByPhone,
    summary,
    items,
  };
}

/** True when the job includes the driveway (drives the driveway-size question). */
export function includesDriveway(selection: Pick<Selection, "package" | "services">): boolean {
  switch (selection.package) {
    case "exterior-refresh":
    case "full-exterior":
      return getBundle(selection.package).includes.includes("driveway");
    case "single":
      return (selection.services ?? []).includes("driveway");
    case "gutter-guard":
      return false;
  }
}

/** True when the selection includes gutter guard (drives the roof-type question). */
export function includesGutterGuard(selection: Pick<Selection, "package">): boolean {
  return selection.package === "gutter-guard" || selection.package === "full-exterior";
}
