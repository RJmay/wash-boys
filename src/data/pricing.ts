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

export type PricedService = {
  id: ServiceId;
  name: string;
  price: number;
  description: string;
  includedArea_m2?: number;
  extraPerM2?: number;
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

/** "$450", or "from $120" for a service priced by size. */
export function servicePriceLabel(service: PricedService): string {
  return `${service.from ? "from " : ""}${formatPrice(service.price)}`;
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
  storeys: Storeys;
};

export type PriceLine = { label: string; amount: number };

export type Quote = {
  lines: PriceLine[];
  total: number;
  deposit: number;
  /** True when the total is a floor ("from"), e.g. gutter guard size not sure. */
  isFrom: boolean;
  /** Things only a phone call settles: valleys, driveway over 60 m2. */
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

  if (selection.package === "exterior-refresh" || selection.package === "full-exterior") {
    const bundle = getBundle(selection.package);
    lines.push({ label: bundle.name, amount: bundle.price });
    summary = bundle.name;
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
      if (service) lines.push({ label: service.name, amount: service.price });
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
  if (items.includes("driveway")) {
    const driveway = getPricedService("driveway");
    if (driveway?.includedArea_m2 && driveway.extraPerM2) {
      confirmByPhone.push(
        `Driveway and paths over ${driveway.includedArea_m2} m² are ${formatPrice(driveway.extraPerM2)} per extra m².`,
      );
    }
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

/** True when the selection includes gutter guard (drives the roof-type question). */
export function includesGutterGuard(selection: Pick<Selection, "package">): boolean {
  return selection.package === "gutter-guard" || selection.package === "full-exterior";
}
