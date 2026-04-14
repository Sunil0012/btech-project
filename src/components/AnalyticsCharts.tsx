import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

interface AnalyticsChartsProps {
  performanceDistribution: Array<{ label: string; students: number }>;
  completionData: Array<{ course: string; completionRate: number; avgAccuracy: number }>;
}

export function AnalyticsCharts({ performanceDistribution, completionData }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Student Performance Distribution</h3>
        <p className="mt-1 text-sm text-muted-foreground">See where students cluster by overall accuracy.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                }}
              />
              <Bar dataKey="students" radius={[10, 10, 0, 0]}>
                {performanceDistribution.map((entry) => (
                  <Cell key={entry.label} fill="hsl(var(--primary))" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Assignment Completion Rate</h3>
        <p className="mt-1 text-sm text-muted-foreground">Compare course completion and average accuracy side by side.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="course" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "16px",
                }}
              />
              <Bar dataKey="completionRate" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
              <Bar dataKey="avgAccuracy" fill="hsl(var(--accent))" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
