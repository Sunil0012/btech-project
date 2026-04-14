import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TeacherAnalyticsChartsProps {
  performanceDistribution: Array<{ label: string; students: number }>;
  completionData: Array<{ course: string; completionRate: number; avgAccuracy: number }>;
}

export function TeacherAnalyticsCharts({
  performanceDistribution,
  completionData,
}: TeacherAnalyticsChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Class Distribution</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Student performance bands</h3>
            <p className="mt-1 text-sm text-muted-foreground">Track how many learners sit in each mastery range.</p>
          </div>
        </div>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(59,130,246,0.06)" }}
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "12px",
                  color: "#0f172a",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                }}
              />
              <Bar dataKey="students" radius={[12, 12, 0, 0]}>
                {performanceDistribution.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={index > 1 ? "rgba(34,197,94,0.85)" : index === 1 ? "rgba(249,115,22,0.85)" : "rgba(59,130,246,0.85)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Completion Signal</p>
        <h3 className="mt-2 text-xl font-semibold text-foreground">Assignments vs accuracy</h3>
        <p className="mt-1 text-sm text-muted-foreground">Spot which courses are completing work without sacrificing quality.</p>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionData}>
              <defs>
                <linearGradient id="teacher-completion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="teacher-accuracy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
              <XAxis dataKey="course" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "12px",
                  color: "#0f172a",
                  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                }}
              />
              <Area
                type="monotone"
                dataKey="completionRate"
                stroke="#3b82f6"
                fill="url(#teacher-completion)"
                strokeWidth={3}
              />
              <Area
                type="monotone"
                dataKey="avgAccuracy"
                stroke="#f97316"
                fill="url(#teacher-accuracy)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
