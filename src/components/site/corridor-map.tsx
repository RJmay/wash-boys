/**
 * Service-area map — SPEC §4.7.
 *
 * Real geometry, not a sketch: suburb positions come from OpenStreetMap via
 * Nominatim and the coastline from Overpass, projected equirectangular with a
 * cos(lat) correction (under a pixel of distortion at this 25km scale).
 * Locals are the audience here, and they would spot a made-up coastline
 * immediately.
 *
 * Regenerate with scripts/ in the scratchpad if the suburb list changes.
 * OSM data is ODbL — the attribution below has to stay.
 */
export function CorridorMap() {
  return (
    <figure className="m-0 w-full max-w-[19rem]">
      <svg
        viewBox="0 0 300 397"
        className="h-auto w-full"
        role="img"
        aria-label="Map of the service area, running from Buderim and Sippy Downs in the north down to Pelican Waters and the Aura estates in the south, with Aroona marked as our base."
      >
        <rect width="300" height="397" className="fill-surface" />

        {/* Water */}
        <path d="M95.7 499.8L93.9 496.9L86.3 497.1L94 495.3L91.8 487.5L86.8 479.5L88.1 480.1L91.3 485.7L90.4 475.4L89.5 474.9L84.1 476.7L79.7 475.1L77.5 472.8L74.1 465.6L74.8 465.1L79.2 472.6L81.2 474.7L83.5 475.3L86.8 474.2L84 473.2L81.9 471.1L85.4 473L88.2 472.9L91.2 474.8L92.3 480.8L96.8 488.7L96.4 491.9L99.7 500.1L112.9 499.9L115.5 496.6L117 495.8L118.1 492.6L120.3 490.4L121.4 485.1L126.8 480.3L129.9 479L129.8 477.2L130.6 478L131.1 480.6L134.2 480.3L138 478.5L141.8 479.8L145.4 479.3L154 474.6L158.6 473.5L170.3 465.9L174.9 464.1L179 459.6L178.1 455L175.5 451.5L176.7 449.2L177.6 449L179.8 460L181.8 459.8L183.4 458.1L187.3 451.9L189 447.5L189.2 441.9L187.3 437L187.1 433.6L185.3 432.8L179.8 440.1L178.9 439.4L178.4 440.6L176.5 441.7L174.9 441.3L175.4 439.2L176.9 438.5L178.7 434.7L180.5 433L184.4 422.3L183.2 416.4L182.2 414.7L181.6 408.6L178.8 401L178.5 397.3L180.1 390.7L180.8 381.4L184.8 374.2L183.7 370.5L181.5 370.6L178.8 375.5L176 377.7L169.7 378.4L164.5 376.6L161.1 377.7L158.8 379.9L155.7 386.3L150.7 391.6L149.1 392.5L149.1 391.8L150.9 390.5L154.1 386.3L155.9 383.2L156.2 381.1L159.1 377.6L163.7 375.7L172.4 375.1L172.8 372.3L176.4 368.5L179.6 366.5L179.2 364.6L180 366.7L188.2 368.1L189.3 367.7L194.3 354.4L197.1 350.5L196.4 350.3L196 347.1L200.7 342.5L201.2 341L200.4 340.5L201 333.8L200.3 330.8L201 327.7L199.9 324.9L199.9 322L201.4 312.2L202.4 310L202.9 304.3L206 296.3L206.1 295.6L204.9 294.7L206.5 294.8L206.8 293L207.9 294.7L210.9 293.4L215 293.7L219.2 296.6L219.5 299L223.1 299.7L224.8 300.9L229.5 296.9L233.3 295L233.8 295.3L234 294L239.8 288.5L241 289L244.4 287.4L247.2 288.6L249.7 287.4L253.1 288.1L255.2 286.9L255.6 285.9L255.5 284.8L254.3 283.8L254.7 281.2L251.2 276.7L250.5 274.3L250.2 267.4L251.7 264.4L248.2 261.8L245.2 260.6L240.8 260.6L238.6 258.6L236.8 254L237.3 251.7L233.9 246.8L229.8 227.5L229.2 208.3L229.7 194.7L225.8 154.9L225.4 135.4L226.9 111.8L227.6 74.4L229.1 49.5L231 37.4L232.3 36.5L233.6 32.5L232.6 31.8L230.6 32.5L225.4 32.6L223.7 31.8L222 32.3L221 31.6L224.9 35.3L223.8 36.9L220.3 34L223.5 37L221.7 39.3L217.3 40.9L211 40.6L202.1 36.2L197 29.8L190.4 25.2L186.6 17.8L179.3 15.7L176.8 13L171 -4L166.9 -25.3L167.2 -33.2L165.5 -40.5L163.4 -77.7L165.1 -100.3L360 -100.3L360 499.8Z" className="fill-harbour/15" />
        <path d="M230.9 499.3L220.4 450.8L217.2 429.9L216.1 401.5L214.7 389L214 372.8L214.9 358.6L216.5 347.9L216.4 343L215.1 340.4L213.2 342.1L213.7 342.5L214.9 341.6L215.5 342.2L214.2 345.8L212.3 356.1L213 359.6L209.5 364.6L209.9 366.4L211.8 368.1L211 370.9L208.4 373.1L205.2 373L203.7 374.1L203.9 375.1L205.7 376.4L205.1 378.5L205.5 384.5L209.5 391.4L210.1 393.9L206.3 391.4L204.6 387.6L202.7 385.8L202.7 382.6L200.4 382.8L197.5 385.4L197.3 386.7L200.1 403.1L204 407.6L205.1 411.2L204 409.2L198.9 404.2L195.9 399.1L195.7 397.1L194.4 396.5L193.6 396.9L194.5 413.7L195.8 420.2L197 421.5L198.4 421.4L197.1 424.8L197.7 435.6L196.2 444.5L194.9 448.2L194.7 450.4L195.2 450.4L193.8 451L190.9 456.6L188.8 458.9L188.2 461.1L183 468.4L177.8 474L175.1 474.9L172.8 477.8L165.9 482.6L161.3 484.6L159.7 483.6L159.5 482.4L161.2 481.5L160.3 480.8L146.9 483.5L148.2 486.4L147.9 487.7L146.2 489.4L147.6 486.2L147.2 485L146.2 484.6L144.7 487.4L140.7 489.4L138.1 493.6L134.1 495L129.4 499.3Z" className="fill-surface" />
        <path d="M212.4 301.2L212.4 301.2Z" className="fill-surface" />
        <path d="M119.9 496.1L119.9 496.1Z" className="fill-surface" />
        <path d="M120 499.6L121.6 496.6L116 499.7Z" className="fill-surface" />
        <path d="M133.2 494.9L133.2 494.9Z" className="fill-surface" />
        <path d="M122.7 499.9L122.7 499.9Z" className="fill-surface" />
        <path d="M197.9 375.3L197.9 375.3Z" className="fill-surface" />

        {/* Coastline */}
        <path
          d="M95.7 499.8L93.9 496.9L86.3 497.1L94 495.3L91.8 487.5L86.8 479.5L88.1 480.1L91.3 485.7L90.4 475.4L89.5 474.9L84.1 476.7L79.7 475.1L77.5 472.8L74.1 465.6L74.8 465.1L79.2 472.6L81.2 474.7L83.5 475.3L86.8 474.2L84 473.2L81.9 471.1L85.4 473L88.2 472.9L91.2 474.8L92.3 480.8L96.8 488.7L96.4 491.9L99.7 500.1L112.9 499.9L115.5 496.6L117 495.8L118.1 492.6L120.3 490.4L121.4 485.1L126.8 480.3L129.9 479L129.8 477.2L130.6 478L131.1 480.6L134.2 480.3L138 478.5L141.8 479.8L145.4 479.3L154 474.6L158.6 473.5L170.3 465.9L174.9 464.1L179 459.6L178.1 455L175.5 451.5L176.7 449.2L177.6 449L179.8 460L181.8 459.8L183.4 458.1L187.3 451.9L189 447.5L189.2 441.9L187.3 437L187.1 433.6L185.3 432.8L179.8 440.1L178.9 439.4L178.4 440.6L176.5 441.7L174.9 441.3L175.4 439.2L176.9 438.5L178.7 434.7L180.5 433L184.4 422.3L183.2 416.4L182.2 414.7L181.6 408.6L178.8 401L178.5 397.3L180.1 390.7L180.8 381.4L184.8 374.2L183.7 370.5L181.5 370.6L178.8 375.5L176 377.7L169.7 378.4L164.5 376.6L161.1 377.7L158.8 379.9L155.7 386.3L150.7 391.6L149.1 392.5L149.1 391.8L150.9 390.5L154.1 386.3L155.9 383.2L156.2 381.1L159.1 377.6L163.7 375.7L172.4 375.1L172.8 372.3L176.4 368.5L179.6 366.5L179.2 364.6L180 366.7L188.2 368.1L189.3 367.7L194.3 354.4L197.1 350.5L196.4 350.3L196 347.1L200.7 342.5L201.2 341L200.4 340.5L201 333.8L200.3 330.8L201 327.7L199.9 324.9L199.9 322L201.4 312.2L202.4 310L202.9 304.3L206 296.3L206.1 295.6L204.9 294.7L206.5 294.8L206.8 293L207.9 294.7L210.9 293.4L215 293.7L219.2 296.6L219.5 299L223.1 299.7L224.8 300.9L229.5 296.9L233.3 295L233.8 295.3L234 294L239.8 288.5L241 289L244.4 287.4L247.2 288.6L249.7 287.4L253.1 288.1L255.2 286.9L255.6 285.9L255.5 284.8L254.3 283.8L254.7 281.2L251.2 276.7L250.5 274.3L250.2 267.4L251.7 264.4L248.2 261.8L245.2 260.6L240.8 260.6L238.6 258.6L236.8 254L237.3 251.7L233.9 246.8L229.8 227.5L229.2 208.3L229.7 194.7L225.8 154.9L225.4 135.4L226.9 111.8L227.6 74.4L229.1 49.5L231 37.4L232.3 36.5L233.6 32.5L232.6 31.8L230.6 32.5L225.4 32.6L223.7 31.8L222 32.3L221 31.6L224.9 35.3L223.8 36.9L220.3 34L223.5 37L221.7 39.3L217.3 40.9L211 40.6L202.1 36.2L197 29.8L190.4 25.2L186.6 17.8L179.3 15.7L176.8 13L171 -4L166.9 -25.3L167.2 -33.2L165.5 -40.5L163.4 -77.7L165.1 -100.3"
          className="stroke-harbour/45"
          strokeWidth="1.2"
          fill="none"
        />

      <circle cx="69.6" cy="45.5" r="2.6" className="fill-harbour/75" />
      <circle cx="220.9" cy="62.4" r="2.6" className="fill-harbour/75" />
      <circle cx="201.6" cy="66.8" r="2.6" className="fill-harbour/75" />
      <circle cx="163.2" cy="74.6" r="2.6" className="fill-harbour/75" />
      <circle cx="201.6" cy="97.4" r="2.6" className="fill-harbour/75" />
      <circle cx="218.5" cy="116.1" r="2.6" className="fill-harbour/75" />
      <circle cx="120.8" cy="128.3" r="2.6" className="fill-harbour/75" />
      <circle cx="215.5" cy="155.3" r="2.6" className="fill-harbour/75" />
      <circle cx="187.2" cy="168.5" r="2.6" className="fill-harbour/75" />
      <circle cx="75.4" cy="175.2" r="2.6" className="fill-harbour/75" />
      <circle cx="212.5" cy="190.1" r="2.6" className="fill-harbour/75" />
      <circle cx="135.2" cy="204.3" r="2.6" className="fill-harbour/75" />
      <circle cx="204.4" cy="214.2" r="2.6" className="fill-harbour/75" />
      <circle cx="216" cy="238.1" r="2.6" className="fill-harbour/75" />
      <circle cx="190.2" cy="245.8" r="5.5" className="fill-hivis stroke-harbour" strokeWidth="2" />
      <circle cx="225.2" cy="248.7" r="2.6" className="fill-harbour/75" />
      <circle cx="151.6" cy="251.6" r="2.6" className="fill-harbour/75" />
      <circle cx="227.2" cy="268.2" r="2.6" className="fill-harbour/75" />
      <circle cx="244.6" cy="274.1" r="2.6" className="fill-harbour/75" />
      <circle cx="226.2" cy="278" r="2.6" className="fill-harbour/75" />
      <circle cx="242" cy="285.9" r="2.6" className="fill-harbour/75" />
      <circle cx="160.8" cy="292.5" r="2.6" className="fill-harbour/75" />
      <circle cx="124.1" cy="300.8" r="2.6" className="fill-harbour/75" />
      <circle cx="197.2" cy="314.2" r="2.6" className="fill-harbour/75" />
      <circle cx="73.2" cy="323.7" r="2.6" className="fill-harbour/75" />
      <circle cx="55.4" cy="335.9" r="2.6" className="fill-harbour/75" />
      <circle cx="162.9" cy="348.9" r="2.6" className="fill-harbour/75" />
      <circle cx="119.7" cy="351.2" r="2.6" className="fill-harbour/75" />

      <text x="62.599999999999994" y="48" textAnchor="end" className="fill-ink-muted text-[8px]">Buderim</text>
      <text x="227.9" y="64.9" textAnchor="start" className="fill-ink-muted text-[8px]">Buddina</text>
      <line x1="205.6" y1="70.9" x2="201.6" y2="66.8" className="stroke-ink-muted/40" strokeWidth="0.6" />
      <text x="208.6" y="75.9" textAnchor="start" className="fill-ink-muted text-[8px]">Minyama</text>
      <line x1="167.2" y1="81.9" x2="163.2" y2="74.6" className="stroke-ink-muted/40" strokeWidth="0.6" />
      <text x="170.2" y="86.9" textAnchor="start" className="fill-ink-muted text-[8px]">Mountain Creek</text>
      <text x="225.5" y="118.6" textAnchor="start" className="fill-ink-muted text-[8px]">Warana</text>
      <text x="113.8" y="130.8" textAnchor="end" className="fill-ink-muted text-[8px]">Sippy Downs</text>
      <text x="68.4" y="177.7" textAnchor="end" className="fill-ink-muted text-[8px]">Palmview</text>
      <text x="128.2" y="206.8" textAnchor="end" className="fill-ink-muted text-[8px]">Meridan Plains</text>
      <text x="211.4" y="216.7" textAnchor="start" className="fill-ink-muted text-[8px]">Currimundi</text>
      <text x="183.2" y="248.3" textAnchor="end" className="fill-ink text-[9px] font-semibold">Aroona — our base</text>
      <text x="233.2" y="280.5" textAnchor="start" className="fill-ink-muted text-[8px]">Caloundra</text>
      <text x="117.1" y="303.3" textAnchor="end" className="fill-ink-muted text-[8px]">Baringa</text>
      <text x="204.2" y="316.7" textAnchor="start" className="fill-ink-muted text-[8px]">Golden Beach</text>
      <text x="169.9" y="351.4" textAnchor="start" className="fill-ink-muted text-[8px]">Pelican Waters</text>
      </svg>

      <figcaption className="mt-2 text-xs text-ink-muted">
        Every suburb we cover, and where we are. Map data ©{" "}
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
  );
}
