import type { Metadata } from "next";

import { Footer, StickyBar } from "@/components/site/chrome";
import { Section, SectionHeading } from "@/components/site/ui";
import { BUSINESS } from "@/data/business";

export const metadata: Metadata = {
  title: `Privacy — ${BUSINESS.name}`,
  description: `How ${BUSINESS.name} handles the personal information you give us when you book a clean.`,
  alternates: { canonical: "/privacy" },
};

/**
 * Privacy page (SPEC §9 launch checklist).
 *
 * Written from what the system actually does rather than from a template: the
 * fields the booking form collects, the three processors that touch them, and
 * what is not done with them. Worth having a solicitor glance over before
 * launch, but an accurate description beats a generic one.
 */
export default function PrivacyPage() {
  const sections: { heading: string; body: string[] }[] = [
    {
      heading: "What we collect",
      body: [
        "When you book, we collect your name, mobile number, the address of the job, the services you picked and the half-day you chose. Email and job notes are optional. If you use the photo quote form, we collect the photos you send.",
        "If you join the gutter waitlist we collect your name, mobile and suburb. If your suburb is outside our service area and you leave your details, we collect your name, mobile and the suburb you named.",
        "We also record which flyer code brought you to the site, so we know which letterbox drops are working. That is stored as a short code in a first-party cookie and against your booking. It contains no personal information on its own.",
      ],
    },
    {
      heading: "Why we collect it",
      body: [
        "To turn up at the right address at the right time, to text you an arrival window, to send your booking confirmation, and to invoice you. That is the whole list.",
        "After a job we record what was done, how long it took and the final price. That helps us quote future jobs more accurately. It is kept against the job, not against you.",
      ],
    },
    {
      heading: "Who else sees it",
      body: [
        "Three services process data on our behalf: our database and file storage provider, our email provider for booking confirmations, and our website host. Each only sees what it needs to do its part.",
        "We do not sell your information, share it with marketing companies, or send you anything you did not ask for. We will not text or email you about anything other than the job you booked, unless you asked to join a waitlist.",
      ],
    },
    {
      heading: "Photos",
      body: [
        "Photos you send us for a quote are stored privately and used only to price your job.",
        "Before-and-after photos of completed work are ours, and we may show them on this site or in advertising. They show surfaces, not people, and we never publish an address or a house number that identifies where the work was done. If you would rather we did not photograph your place at all, tell us on the day and we will not.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "Booking and job records are kept while we are trading, because we need them for tax and warranty purposes. Waitlist and enquiry details are kept until the service launches or you ask us to remove them.",
      ],
    },
    {
      heading: "Access, correction and complaints",
      body: [
        `Ask us for a copy of what we hold about you, or ask us to correct or delete it, by emailing ${BUSINESS.email} or calling ${BUSINESS.phone.display}. We will action it within a reasonable time and at no cost.`,
        "If you are not happy with how we have handled your information, tell us first and we will try to fix it. If that does not resolve it, you can complain to the Office of the Australian Information Commissioner at oaic.gov.au.",
      ],
    },
    {
      heading: "Cookies",
      body: [
        "We use one first-party cookie to remember which flyer code brought you here, so we can tell which drops worked. It expires after 90 days. We do not use advertising or cross-site tracking cookies.",
      ],
    },
  ];

  return (
    <>
      <StickyBar />
      <main>
        <Section labelledBy="privacy-heading">
          <SectionHeading id="privacy-heading">Privacy</SectionHeading>
          <p className="mt-3 text-ink-muted">
            {BUSINESS.name}, ABN {BUSINESS.abn}. This explains what we do with
            the details you give us when you book a clean.
          </p>

          <div className="mt-6 space-y-6">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-sm font-semibold tracking-wide text-harbour uppercase">
                  {section.heading}
                </h2>
                {section.body.map((para) => (
                  <p key={para} className="mt-2 text-ink-muted">
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <p className="mt-8 border-t border-line pt-5 text-sm text-ink-muted">
            Questions about any of this? Call {BUSINESS.phone.display} or email{" "}
            {BUSINESS.email}.
          </p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
