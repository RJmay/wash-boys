"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { BUSINESS } from "@/data/business";
import { getSuburb, REGIONS, suburbsInRegion } from "@/data/suburbs";
import { MAP } from "./corridor-geometry";

/**
 * Interactive service-area map — SPEC §4.7.
 *
 * Geometry is real (see corridor-geometry.ts). This part makes it answer the
 * question a scanner actually has: "do you come to my street, and what would
 * you even do here?" Tapping a suburb — on the map or in the list — names it,
 * says what dirties houses there, and offers the booking.
 *
 * The suburb hooks are the ones already written for the SEO pages, so the
 * answer is specific to the place rather than generic coverage copy.
 *
 * Progressive enhancement: with JavaScript off the map still draws and every
 * suburb is still listed and readable. Only the selection is lost, and the
 * page is not a booking flow, so that is an acceptable degradation
 * (CLAUDE.md).
 */
export function CorridorMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const panelId = useId();
  const suburb = selected ? getSuburb(selected) : null;

  const dotClass = (slug: string) =>
    slug === selected
      ? "fill-hivis stroke-harbour"
      : slug === "aroona"
        ? "fill-hivis stroke-harbour"
        : "fill-harbour/75 stroke-transparent";

  return (
    <div className="mt-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <figure className="m-0 w-full max-w-[17rem] shrink-0">
          <svg
            viewBox={`0 0 ${MAP.width} ${MAP.height}`}
            className="h-auto w-full touch-manipulation"
            role="img"
            aria-label="Map of the service area, from Buderim and Sippy Downs in the north down to Pelican Waters and the Aura estates in the south, with Aroona marked as our base."
          >
            <rect width={MAP.width} height={MAP.height} className="fill-surface" />

            <path d={MAP.sea} className="fill-harbour/15" />
            {MAP.islands.map((d) => (
              <path key={d} d={d} className="fill-surface" />
            ))}
            <path
              d={MAP.coast}
              className="stroke-harbour/45"
              strokeWidth="1.2"
              fill="none"
            />

            {/* Labels shown at rest, with a leader when one had to move off its dot. */}
            {Object.entries(MAP.labels).map(([slug, label]) => {
              const point = MAP.points[slug as keyof typeof MAP.points];
              const isBase = slug === "aroona";
              if (slug === selected) return null;
              return (
                <g key={slug}>
                  {label.leader ? (
                    <line
                      x1={label.lx}
                      y1={label.ly}
                      x2={point[0]}
                      y2={point[1]}
                      className="stroke-ink-muted/40"
                      strokeWidth="0.6"
                    />
                  ) : null}
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    className={
                      isBase
                        ? "fill-ink text-[9px] font-semibold"
                        : "fill-ink-muted text-[8px]"
                    }
                  >
                    {isBase ? `${getSuburb(slug)?.name} — our base` : getSuburb(slug)?.name}
                  </text>
                </g>
              );
            })}

            {/*
              Pointer targets only, deliberately hidden from assistive tech.
              The chips below are the accessible control and carry the same
              names, so exposing these too would announce all 28 suburbs twice
              and add 28 redundant tab stops before the list. The transparent
              circle is the hit area - a 2.6-unit dot is far under the 44px
              minimum on a phone.
            */}
            {Object.entries(MAP.points).map(([slug, [x, y]]) => {
              const isSelected = slug === selected;
              return (
                <g
                  key={slug}
                  aria-hidden="true"
                  className="cursor-pointer"
                  onClick={() => setSelected(isSelected ? null : slug)}
                  onMouseEnter={() => setSelected(slug)}
                >
                  <circle cx={x} cy={y} r="11" fill="transparent" />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 6 : slug === "aroona" ? 5.5 : 2.6}
                    strokeWidth="2"
                    className={dotClass(slug)}
                  />
                </g>
              );
            })}

            {/* The selected suburb labels itself, over the top of everything. */}
            {selected && suburb ? (
              <SelectedLabel slug={selected} name={suburb.name} />
            ) : null}
          </svg>

          <figcaption className="mt-2 text-xs text-ink-muted">
            Map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              className="underline underline-offset-2"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>{" "}
            contributors.
          </figcaption>
        </figure>

        {/* Reserved height, so selecting a suburb never shifts the layout. */}
        <div
          id={panelId}
          aria-live="polite"
          className="min-h-[9.5rem] w-full rounded-xl border border-line bg-surface p-4 sm:min-h-[13rem]"
        >
          {suburb ? (
            <>
              <h3 className="font-display text-xl tracking-wide text-harbour uppercase">
                {suburb.name}
              </h3>
              <p className="mt-2 text-sm text-ink-muted">{suburb.hook}</p>
              <Link
                href={{ pathname: "/book", query: { suburb: suburb.slug } }}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-harbour underline underline-offset-4"
              >
                Book a clean in {suburb.name}
                <span aria-hidden="true">→</span>
              </Link>
            </>
          ) : (
            <>
              <h3 className="font-display text-xl tracking-wide text-harbour uppercase">
                {Object.keys(MAP.points).length} suburbs
              </h3>
              <p className="mt-2 text-sm text-ink-muted">
                Pick one to see what dirties houses there. We are based in{" "}
                {BUSINESS.base.suburb}, marked in yellow, so most of these are a
                short run for us.
              </p>
            </>
          )}
        </div>
      </div>

      {/* The full list, and the keyboard-friendly way to drive the map. */}
      <div className="mt-6 space-y-5">
        {REGIONS.map((region) => (
          <div key={region}>
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-harbour uppercase">
              <span aria-hidden="true" className="h-px w-6 bg-harbour/40" />
              {region}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {suburbsInRegion(region).map((entry) => {
                const isSelected = entry.slug === selected;
                return (
                  <li key={entry.slug}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-controls={panelId}
                      onClick={() =>
                        setSelected(isSelected ? null : entry.slug)
                      }
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        isSelected
                          ? "border-harbour bg-harbour text-white"
                          : "border-line bg-surface text-ink hover:border-harbour/50"
                      }`}
                    >
                      {entry.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Selected suburb name, drawn last so it sits above the other labels. */
function SelectedLabel({ slug, name }: { slug: string; name: string }) {
  const [x, y] = MAP.points[slug as keyof typeof MAP.points];
  const right = x <= 150;
  const tx = right ? x + 9 : x - 9;
  const width = name.length * 4.6 + 8;

  return (
    <g className="pointer-events-none">
      <rect
        x={right ? tx - 4 : tx - width + 4}
        y={y - 7}
        width={width}
        height="13"
        rx="3"
        className="fill-harbour"
      />
      <text
        x={right ? tx : tx - 1}
        y={y + 2.5}
        textAnchor={right ? "start" : "end"}
        className="fill-white text-[8.5px] font-semibold"
      >
        {name}
      </text>
    </g>
  );
}
