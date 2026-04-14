import type { ElementType } from "react";

interface TeacherMetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: ElementType;
  tone?: "blue" | "orange" | "green" | "rose";
}

const toneMap = {
  blue: {
    shell: "border-primary/10 bg-card",
    icon: "bg-sky-100 text-sky-700",
    bar: "from-sky-500 via-blue-500 to-cyan-400",
    glow: "bg-sky-100/70",
  },
  orange: {
    shell: "border-accent/10 bg-card",
    icon: "bg-orange-100 text-orange-700",
    bar: "from-orange-500 via-amber-500 to-yellow-400",
    glow: "bg-orange-100/70",
  },
  green: {
    shell: "border-success/10 bg-card",
    icon: "bg-emerald-100 text-emerald-700",
    bar: "from-emerald-500 via-teal-500 to-lime-400",
    glow: "bg-emerald-100/70",
  },
  rose: {
    shell: "border-warning/10 bg-card",
    icon: "bg-rose-100 text-rose-700",
    bar: "from-rose-500 via-pink-500 to-orange-300",
    glow: "bg-rose-100/70",
  },
} as const;

export function TeacherMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: TeacherMetricCardProps) {
  const colors = toneMap[tone];

  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 shadow-sm ${colors.shell}`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colors.bar}`} />
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${colors.glow}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {detail ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
