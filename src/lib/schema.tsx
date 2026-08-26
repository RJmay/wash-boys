import { BUSINESS } from "@/data/business";
import { SUBURBS } from "@/data/suburbs";
import type { Service } from "@/data/services";
import { serviceRange } from "@/data/services";

/**
 * schema.org markup (SPEC §9).
 *
 * Everything here has to be true. Structured data is read by machines that
 * will happily surface a price or an area we do not honour, and a
 * LocalBusiness claiming a suburb we do not service is worse than no markup at
 * all.
 */

const SITE = `https://${BUSINESS.domain}`;

/** The business itself. A service-area business, not a shopfront. */
export function localBusiness() {
  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": `${SITE}/#business`,
    name: BUSINESS.name,
    description:
      "Driveway, house, patio and fence cleaning across the Caloundra to Buderim corridor on the Sunshine Coast.",
    url: SITE,
    telephone: BUSINESS.phone.tel,
    email: BUSINESS.email,
    // No street address: we come to you, and publishing a home address as a
    // shopfront would be inviting people to turn up at it.
    address: {
      "@type": "PostalAddress",
      addressLocality: BUSINESS.base.suburb,
      addressRegion: BUSINESS.base.state,
      addressCountry: BUSINESS.base.country,
    },
    areaServed: SUBURBS.map((suburb) => ({
      "@type": "City",
      name: suburb.name,
      addressRegion: "QLD",
      postalCode: suburb.postcode,
    })),
    priceRange: "$$",
    currenciesAccepted: "AUD",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "07:00",
        closes: "17:00",
      },
    ],
  };
}

/**
 * A single service. Only ever emitted for services we actually sell - the
 * coming-soon gutter page gets no offer markup, because there is nothing to
 * offer yet.
 */
export function serviceSchema(service: Service, suburbName?: string) {
  const range = serviceRange(service);
  const priced = service.pricing.kind !== "unpriced";

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: suburbName ? `${service.name} in ${suburbName}` : service.name,
    description: service.description,
    provider: { "@id": `${SITE}/#business` },
    areaServed: suburbName
      ? { "@type": "City", name: suburbName, addressRegion: "QLD" }
      : SUBURBS.map((s) => ({ "@type": "City", name: s.name })),
    ...(priced && {
      offers: {
        "@type": "Offer",
        priceCurrency: "AUD",
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: range.low,
          maxPrice: range.high,
          priceCurrency: "AUD",
          valueAddedTaxIncluded: true,
        },
      },
    }),
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
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

/** Renders a JSON-LD block. Next dedupes identical script tags. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
