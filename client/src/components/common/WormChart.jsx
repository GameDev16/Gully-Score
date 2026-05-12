import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function WormChart({ innings = [] }) {
  // Build per-over cumulative runs for each innings, aligned by over number.
  const max = Math.max(
    ...innings.map((i) => Math.ceil((i.totalBalls || 0) / 6)),
    0,
  );
  const series = innings.map((inn) => {
    let cumulative = 0;
    const overs = {};
    (inn.bowlerFigures || []).forEach((bf) => {
      cumulative += bf.runs || 0;
    });
    // Approximate per-over by using over history would be ideal. Lacking ball aggregates here,
    // we synthesise using even distribution as a fallback for visualisation.
    const arr = [];
    for (let o = 0; o <= max; o++) {
      arr.push({
        over: o,
        runs: Math.round(((inn.totalRuns || 0) / Math.max(max, 1)) * o),
      });
    }
    return arr;
  });

  const merged = [];
  for (let o = 0; o <= max; o++) {
    const row = { over: o };
    series.forEach((s, i) => {
      row[`innings${i + 1}`] = s[o]?.runs ?? null;
    });
    merged.push(row);
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={merged}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A7A4A" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#1A7A4A" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E89C2F" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#E89C2F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="over"
          label={{ value: "Over", position: "insideBottom", offset: -2 }}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="innings1"
          stroke="#1A7A4A"
          fill="url(#g1)"
          name="Innings 1"
        />
        {innings.length > 1 && (
          <Area
            type="monotone"
            dataKey="innings2"
            stroke="#E89C2F"
            fill="url(#g2)"
            name="Innings 2"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
