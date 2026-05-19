import { formatCurrency } from "@/lib/utils";

interface Props {
  data: number[];
}

export function RevenueChart({ data }: Props) {
  if (data.length === 0) return null;

  const width = 600;
  const height = 140;
  // Left padding maggiore per ospitare le etichette dell'asse Y
  // fuori dal plot (es. "3.000 €").
  const padding = { top: 8, right: 6, bottom: 18, left: 56 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Dati cumulativi: revenue_daily è il totale incassato fino a quel
  // giorno (vedi migration 20260519210000). La linea cresce a gradini
  // quando arriva un incasso e non torna mai a zero.
  const first = data[0] ?? 0;
  const today = data[data.length - 1] ?? 0;
  const hasGrowth = today > first;

  // Asse Y: se c'è stata crescita nella finestra parto dal valore
  // iniziale (così la crescita resta leggibile anche con base alta).
  // Se invece la linea è piatta, mostro tutto da 0 al valore corrente
  // per dare contesto assoluto.
  const yMin = hasGrowth ? first : 0;
  const yMax = hasGrowth ? today : Math.max(today, 1);
  const yRange = Math.max(yMax - yMin, 1);
  const stepX = chartW / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - ((v - yMin) / yRange) * chartH;
    return [x, y] as const;
  });

  const lineD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaD = `${lineD} L${padding.left + chartW},${padding.top + chartH} L${padding.left},${padding.top + chartH} Z`;

  // Etichette asse Y a 5 livelli (top, 25, 50, 75, bottom). Calcolate
  // dal range reale; arrotondiamo a euro interi per leggibilità.
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    yPx: padding.top + chartH * pct,
    value: Math.round(yMin + (1 - pct) * yRange),
  }));

  // Date labels (-30gg, -15gg, oggi)
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
          <stop offset="0%" stopColor="rgb(var(--status-success))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--status-success))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gridlines orizzontali sottili in corrispondenza dei tick Y. */}
      {yTicks.map((t, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={t.yPx}
          x2={padding.left + chartW}
          y2={t.yPx}
          stroke="rgb(var(--border))"
          strokeWidth="1"
          strokeDasharray={i === 0 || i === yTicks.length - 1 ? undefined : "2 4"}
          opacity={i === 0 || i === yTicks.length - 1 ? 0.6 : 1}
        />
      ))}

      <path d={areaD} fill="url(#revenue-grad)" />
      <path
        d={lineD}
        fill="none"
        stroke="rgb(var(--status-success))"
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
          fill="rgb(var(--status-success))"
        />
      )}

      {/* Y-axis labels — fuori dal plot, allineate a destra contro il
       * bordo sinistro del grafico. */}
      {yTicks.map((t, i) => (
        <text
          key={i}
          x={padding.left - 6}
          y={t.yPx + 3}
          textAnchor="end"
          fontSize="10"
          fill="rgb(var(--text-subtle))"
        >
          {formatCurrency(t.value)}
        </text>
      ))}

      {/* X-axis labels (date) */}
      <text x={padding.left} y={height - 4} fontSize="10" fill="rgb(var(--text-subtle))">
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
  );
}
