import { PLACEHOLDERS } from "./placeholders";
import { DEPOSITS, DOUBLE_STOREY, formatPrice } from "./pricing";

/**
 * FAQ (docs/brief/site-content.md). A question whose answer is still a
 * placeholder shows only while developing; production builds and the FAQPage
 * structured data leave it out until the answer is filled in.
 */

export type FaqItem = {
  q: string;
  a: string;
};

export const FAQ: readonly FaqItem[] = [
  {
    q: "Do I need to be home?",
    a: "No. Leave side gates unlocked and an outside tap available.",
  },
  {
    q: "Will soft washing damage my paint or plants?",
    a: "No. Soft washing uses low pressure, which is gentler on paint than a pressure washer. We wet garden beds before and after.",
  },
  {
    q: "Where does the water go?",
    a: "We cover nearby street drains and keep wash water off the road. Clean rinse water goes onto lawns.",
  },
  {
    q: "What if it rains?",
    a: "We move you to the next available day at no cost.",
  },
  {
    q: "How do I pay?",
    a: `A ${formatPrice(DEPOSITS.cleaning)} deposit by bank transfer holds your day (${formatPrice(DEPOSITS.gutterGuard)} with gutter guard). Nothing is paid on the website. We invoice the balance after the job.`,
  },
  {
    q: "Can I change or cancel my booking?",
    a: PLACEHOLDERS.cancellationFaq,
  },
  {
    q: "What if I'm not happy with something?",
    a: PLACEHOLDERS.notHappyFaq,
  },
  {
    q: "Do you do double-storey?",
    a: `Yes: +${formatPrice(DOUBLE_STOREY.washingAndWindows)} on washing and windows, +${formatPrice(DOUBLE_STOREY.gutterGuard)} on gutter guard.`,
  },
  {
    q: "Do you clean roofs or solar panels?",
    a: "Not yet.",
  },
  {
    q: "How long does gutter guard last?",
    a: PLACEHOLDERS.gutterGuardFaq,
  },
  {
    q: "Are you insured?",
    a: PLACEHOLDERS.insuranceFaq,
  },
];
