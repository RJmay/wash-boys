import { BUSINESS } from "@/data/business";

/**
 * Placeholder. The real landing page is session 2 (SPEC §4) and starts with a
 * design pass — tokens, then the before/after hero, then the build. Nothing
 * here is a design decision.
 */
export default function Home() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">{BUSINESS.name}</h1>
      <p>{BUSINESS.tagline}</p>
      <p className="text-sm">
        Site under construction. Scaffold and database are in place; the
        landing page lands next.
      </p>
    </main>
  );
}
