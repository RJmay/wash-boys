/**
 * Landing-page and service-page FAQ (SPEC §4.9).
 *
 * These answer the questions a homeowner actually hesitates over before
 * letting strangers onto the property. Keep them plain, keep them true, and
 * never answer a question about gutters as though we already do them.
 */

export type FaqItem = {
  q: string;
  a: string;
};

export const FAQ: readonly FaqItem[] = [
  {
    q: "Do I need to be home?",
    a: "No. As long as we can reach the outside tap and get to the area, we can do the job while you are out. We will text you when we are on the way and again when we are done.",
  },
  {
    q: "Whose water do you use?",
    a: "We run off your outside tap, which is standard for the trade. If your tap is hard to get to or turned off at the mains, mention it in the booking notes so we can plan for it.",
  },
  {
    q: "Are you insured?",
    a: "Yes, we carry public liability insurance and we are happy to show the certificate before we start. Our ABN is on every invoice and in the footer of this page.",
  },
  {
    q: "Will pressure washing damage my surfaces?",
    a: "It can, in the wrong hands, which is why we match the pressure to the surface. Driveways and concrete take a surface cleaner. Walls do not get high pressure at all - render, brick and weatherboard get a low-pressure soft wash instead, because forcing water behind cladding causes far more damage than the mould ever would.",
  },
  {
    q: "Do you do two-storey houses?",
    a: "Not as a standard booking yet. Send us a photo through the quote page and we will price it properly rather than guess. Single-storey soft washes are bookable online right now.",
  },
  {
    q: "How does the price work?",
    a: "The prices on this page are ranges, not quotes. We confirm the final price with you on site before we start any work, so there are no surprises when we finish. Driveways and house washes are priced per job, patios on area and fences by the metre.",
  },
  {
    q: "When do I pay?",
    a: "On the day, once the job is done and you have had a look at it. No deposit, and nothing to pay upfront when you book.",
  },
  {
    q: "What happens if it rains?",
    a: "Light rain is not a problem - we are spraying water either way. If there is a storm or heavy rain forecast for your slot we will call you and move it to the next one that suits.",
  },
  {
    q: "What if I am not happy with the result?",
    a: "Tell us and we will come back and re-wash it free. That is the whole guarantee - no forms, no argument.",
  },
  {
    q: "Do you clean gutters?",
    a: "Not yet. We are getting set up for it ahead of storm season and we will not book or quote gutter work until we are properly equipped for it. Join the waitlist and you will be the first call when it goes live.",
  },
];
