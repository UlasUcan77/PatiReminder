import type { WeightEntry } from "@patireminder/shared";

const W = 600;
const H = 160;
const PAD = { top: 16, right: 16, bottom: 24, left: 40 };

/** A small hand-drawn line chart; one series doesn't need a chart library. */
export function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;

  const times = entries.map((e) => new Date(e.measuredAt).getTime());
  const kgs = entries.map((e) => e.kg);
  const [tMin, tMax] = [Math.min(...times), Math.max(...times)];
  const spread = Math.max(...kgs) - Math.min(...kgs) || 1;
  const [kMin, kMax] = [Math.min(...kgs) - spread * 0.2, Math.max(...kgs) + spread * 0.2];

  const x = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * (W - PAD.left - PAD.right);
  const y = (k: number) => PAD.top + (1 - (k - kMin) / (kMax - kMin)) * (H - PAD.top - PAD.bottom);
  const points = entries.map((e, i) => [x(times[i]), y(e.kg)] as const);
  const date = (t: number) => new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kilo grafiği">
      {[kMin, (kMin + kMax) / 2, kMax].map((k) => (
        <g key={k}>
          <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(k)} y2={y(k)} />
          <text x={PAD.left - 6} y={y(k) + 4} textAnchor="end">
            {k.toFixed(1)}
          </text>
        </g>
      ))}
      <polyline className="line" points={points.map((p) => p.join(",")).join(" ")} />
      {points.map(([px, py], i) => (
        <circle key={entries[i].id} className="dot" cx={px} cy={py} r={4}>
          <title>{`${date(times[i])}: ${entries[i].kg} kg`}</title>
        </circle>
      ))}
      <text x={PAD.left} y={H - 6}>
        {date(tMin)}
      </text>
      <text x={W - PAD.right} y={H - 6} textAnchor="end">
        {date(tMax)}
      </text>
    </svg>
  );
}
