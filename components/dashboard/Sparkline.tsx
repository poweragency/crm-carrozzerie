interface Props {
  data: number[];
  stroke?: string;
  height?: number;
}

export function Sparkline({ data, stroke = "currentColor", height = 28 }: Props) {
  if (data.length < 2) {
    return (
      <div
        className="text-[10px] text-text-subtle"
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  const width = 100; // viewbox unit
  // Asse Y dal minimo REALE dei dati (non da 0): le serie cumulative
  // partono spesso da una base storica e con il vecchio floor a 0 la
  // crescita interna alla finestra restava compressa contro il bordo
  // alto. Una serie piatta finisce comunque sul bordo basso, che è
  // un segnale visivo onesto di "nessuna nuova attività".
  const dataMin = Math.min(...data);
  const max = Math.max(...data, dataMin + 1);
  const range = max - dataMin || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - dataMin) / range) * height;
    return [x, y] as const;
  });

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaD = `${pathD} L${width},${height} L0,${height} Z`;

  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;

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
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
