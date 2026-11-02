import { BUSINESS } from "@/data/business";
import { isFilled } from "@/data/placeholders";
import {
  BUNDLES,
  formatPrice,
  GUTTER_GUARD,
  GUTTER_GUARD_FROM,
  itemName,
} from "@/data/pricing";
import { SERVICE_PAGES, servicePrice, type ServicePage } from "@/data/services";
import { SUBURBS, type Suburb } from "@/data/suburbs";

/**
 * schema.org markup.
 *
 * Everything here has to be true. No ratings, reviews, opening hours or
 * accreditations: we have none to state yet. Prices come from pricing.json,
 * GST included.
 */

const SITE = `https://${BUSINESS.domain}`;
const BUSINESS_ID = `${SITE}/#business`;

function place(suburb: Suburb) {
  return {
    "@type": "Place",
    name: `${suburb.name} QLD ${suburb.postcode}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: suburb.name,
      postalCode: suburb.postcode,
      addressRegion: BUSINESS.base.state,
      addressCountry: BUSINESS.base.country,
    },
  };
}

function offer(name: string, price: number, url: string, minPrice = false) {
  return {
    "@type": "Offer",
    name,
    url: `${SITE}${url}`,
    priceCurrency: "AUD",
    priceSpecification: {
      "@type": "PriceSpecification",
      priceCurrency: "AUD",
      valueAddedTaxIncluded: true,
      ...(minPrice ? { minPrice: price } : { price }),
    },
  };
}

/** The business itself. A service-area business, not a shopfront. */
export function localBusiness() {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": BUSINESS_ID,
    name: BUSINESS.name,
    description:
      "House soft washing, driveway pressure cleaning, gutter cleaning, exterior windows and gutter guard installation on the Sunshine Coast.",
    url: SITE,
    telephone: BUSINESS.phone.tel,
    email: BUSINESS.email,
    taxID: BUSINESS.abn,
    // No street address: we come to you.
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.base.suburb,
      addressRegion: BUSINESS.base.state,
      addressCountry: BUSINESS.base.country,
    },
    areaServed: SUBURBS.map(place),
    currenciesAccepted: "AUD",
    priceRange: `${formatPrice(Math.min(...SERVICE_PAGES.map((p) => servicePrice(p).price)))}–${formatPrice(Math.max(...GUTTER_GUARD.packages.map((p) => p.price)))}`,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Exterior home services",
      itemListElement: [
        ...BUNDLES.filter((b) => b.id !== "annual-refresh").map((b) =>
          offer(`${b.name}: ${b.includes.map(itemName).join(", ")}`, b.price, "/pricing"),
        ),
        ...SERVICE_PAGES.map((p) => {
          const { name, price, from } = servicePrice(p);
          return offer(name, price, `/services/${p.slug}`, from);
        }),
        offer("Gutter guard supply and installation", GUTTER_GUARD_FROM, "/gutter-guard", true),
      ],
    },
  };
}

/** One service, optionally scoped to a suburb page. */
export function serviceSchema(
  service: ServicePage | "gutter-guard",
  suburb?: Suburb,
) {
  const isGuard = service === "gutter-guard";
  const name = isGuard ? "Gutter guard supply and installation" : servicePrice(service).name;
  const price = isGuard ? GUTTER_GUARD_FROM : servicePrice(service).price;
  const isFrom = isGuard || servicePrice(service).from;
  const url = isGuard ? "/gutter-guard" : `/services/${service.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: suburb ? `${name} in ${suburb.name}` : name,
    serviceType: isGuard ? "Gutter guard installation" : service.heading,
    provider: { "@id": BUSINESS_ID },
    areaServed: suburb ? place(suburb) : SUBURBS.map(place),
    offers: offer(name, price, url, isFrom),
  };
}

/** FAQ markup. Placeholder answers are left out - they are not answers yet. */
export function faqSchema(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
      .filter((item) => isFilled(item.a))
      .map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
  };
}

export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE}${item.path}`,
    })),
  };
}

/** Renders a JSON-LD block. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
