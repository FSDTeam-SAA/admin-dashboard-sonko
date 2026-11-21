import { useState } from "react";
import { BORDERS, CENTROIDS, LAND, VIEWS } from "../lib/worldMap";
import { countryName } from "../lib/countryName";
import { Tabs } from "../components/common";
import type { CountryCount } from "../api/admin";

type View = keyof typeof VIEWS;

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Which dots get their number written beside them. Bigger countries are
 * placed first; a number that would sit on top of one already placed (or on
 * another dot) is left off. It still shows in the list, on hover, and when
 * zoomed in. Sizes are in screen-sized units (the same at every zoom).
 */
export function labelled(
  dots: { id: string; x: number; y: number; r: number; text: string }[],
): Set<string> {
  const taken: Box[] = dots.map((d) => ({
    x: d.x - d.r,
    y: d.y - d.r,
    w: 2 * d.r,
    h: 2 * d.r,
  }));
  const out = new Set<string>();
  for (const d of [...dots].sort((a, b) => b.r - a.r)) {
    const box = {
      x: d.x + d.r + 2,
      y: d.y - 8,
      w: d.text.length * 7.5 + 2,
      h: 14,
    };
    const own = (b: Box) => b.x === d.x - d.r && b.y === d.y - d.r;
    if (taken.some((b) => !own(b) && overlaps(box, b))) continue;
    taken.push(box);
    out.add(d.id);
  }
  return out;
}

/** Dot size on the map, in screen-sized units: bigger for more, never too small to see. */
export function dotRadius(count: number, biggest: number): number {
  if (count <= 0 || biggest <= 0) return 0;
  return 4 + 14 * Math.sqrt(count / biggest);
}

/**
 * A world map drawn inside the panel (no outside map service), with a dot on
 * each country sized by its number, and the number beside it. Countries too
 * small for this map have no dot; the list next to it always shows every one.
 */
export default function WorldMap({
  rows,
  label,
}: {
  rows: CountryCount[];
  label: string;
}) {
  const [view, setView] = useState<View>("world");
  const [x, y, w, h] = VIEWS[view];
  const k = w / 1000; // keeps dots and numbers the same size on screen when zoomed in
  const onMap = rows.filter((r) => CENTROIDS[r.country] && r.count > 0);
  const biggest = Math.max(0, ...onMap.map((r) => r.count));
  // Biggest drawn first so small dots stay on top and can be seen.
  const drawn = [...onMap].sort((a, b) => b.count - a.count);
  const withText = labelled(
    drawn.map((r) => {
      const [cx, cy] = CENTROIDS[r.country]!;
      return {
        id: r.country,
        x: cx / k,
        y: cy / k,
        r: dotRadius(r.count, biggest),
        text: r.count.toLocaleString("en-GB"),
      };
    }),
  );
  return (
    <div>
      <Tabs
        value={view}
        options={
          [
            ["world", "World"],
            ["europe", "Europe"],
            ["westAfrica", "West Africa"],
          ] as const
        }
        onChange={setView}
      />
      <svg
        className="world-map"
        viewBox={`${x} ${y} ${w} ${h}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
      >
        <path d={LAND} fill="var(--line)" />
        <path
          d={BORDERS}
          fill="none"
          stroke="var(--surface)"
          strokeWidth={0.6 * k}
        />
        {drawn.map((r) => {
          const [cx, cy] = CENTROIDS[r.country]!;
          const rad = dotRadius(r.count, biggest) * k;
          return (
            <g key={r.country}>
              <title>{`${countryName(r.country) ?? r.country}: ${r.count.toLocaleString("en-GB")}`}</title>
              <circle
                cx={cx}
                cy={cy}
                r={rad}
                fill="var(--primary)"
                fillOpacity={0.55}
                stroke="var(--primary)"
                strokeWidth={1 * k}
              />
              {withText.has(r.country) && (
                <text
                  x={cx + rad + 2 * k}
                  y={cy + 4 * k}
                  fontSize={12 * k}
                  fill="var(--text)"
                  stroke="var(--surface)"
                  strokeWidth={3 * k}
                  paintOrder="stroke"
                  fontWeight={600}
                >
                  {r.count.toLocaleString("en-GB")}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
