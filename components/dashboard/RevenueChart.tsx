import { formatCurrency } from "@/lib/utils";

interface Props {
  data: number[];
}

export function RevenueChart({ data }: Props) {
  if (data.length === 0) return null;

  const width = 600;
  const height = 140;
  const padding = { top: 8, right: 4, bottom: 18, left: 4 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(...data, 1);
  const stepX = chartW / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - (v / max) * chartH;
    return [x, y] as const;
  });

  const lineD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaD = `${lineD} L${padding.left + chartW},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  const total = data.reduce((a, b) => a + b, 0);
  const avg = total / data.length;
  const today = data[data.length - 1] ?? 0;

  // Date labels (oggi, -15gg, -30gg)
  const now = new Date();
  const dateAt = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    return d.toLocaleDateString("it-IT", {
      timeZone: "Europe/Rome",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        style={{ display: "block" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid soft */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padding.left}
            y1={padding.top + chartH * p}
            x2={padding.left + chartW}
            y2={padding.top + chartH * p}
            stroke="rgb(var(--border))"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        ))}

        <path d={areaD} fill="url(#revenue-grad)" />
        <path
          d={lineD}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ultimo punto evidenziato */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1][0]}
            cy={points[points.length - 1][1]}
            r="3"
            fill="rgb(var(--accent))"
          />
        )}

        {/* Date labels */}
        <text
          x={padding.left}
          y={height - 4}
          fontSize="10"
          fill="rgb(var(--text-subtle))"
        >
          {dateAt(data.length - 1)}
        </text>
        <text
          x={padding.left + chartW / 2}
          y={height - 4}
          fontSize="10"
          fill="rgb(var(--text-subtle))"
          textAnchor="middle"
        >
          {dateAt(Math.floor(data.length / 2))}
        </text>
        <text
          x={padding.left + chartW}
          y={height - 4}
          fontSize="10"
          fill="rgb(var(--text-subtle))"
          textAnchor="end"
        >
          Oggi
        </text>
      </svg>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <div className="text-[10px] uppercase text-text-subtle">Oggi</div>
          <div className="text-xs font-medium tabular-nums">{formatCurrency(today)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-text-subtle">Media/giorno</div>
          <div className="text-xs font-medium tabular-nums">{formatCurrency(avg)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-text-subtle">Picco</div>
          <div className="text-xs font-medium tabular-nums">{formatCurrency(max)}</div>
        </div>
      </div>
    </div>
  );
}
