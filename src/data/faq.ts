import { PLACEHOLDERS } from "./placeholders";
import { DOUBLE_STOREY, formatPrice } from "./pricing";

/**
 * FAQ (docs/brief/site-content.md). Answers that are still placeholders
 * render visibly on the page but are left out of the FAQPage structured data,
 * so search engines never quote a placeholder.
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
