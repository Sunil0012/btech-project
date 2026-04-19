import { type ReactNode, useMemo } from "react";
import { CheckCircle2, CircleDot, Sparkles, Target } from "lucide-react";

export type TopicMasteryBubble = {
  id: string;
  label: string;
  subjectLabel: string;
  accuracy: number;
  attempts: number;
  status: "weak" | "developing" | "strong";
};

type DifficultyBreakdown = {
  easy: number;
  medium: number;
  hard: number;
};

type PositionedBubble = TopicMasteryBubble & {
  radius: number;
  x: number;
  y: number;
};

function getStatusColor(status: TopicMasteryBubble["status"], accuracy: number) {
  if (status === "strong" || accuracy >= 75) {
    return {
      accent: "#22c55e",
      glow: "rgba(34,197,94,0.32)",
      label: "#86efac",
    };
  }

  if (status === "developing" || accuracy >= 55) {
    return {
      accent: "#f59e0b",
      glow: "rgba(245,158,11,0.28)",
      label: "#fcd34d",
    };
  }

  return {
    accent: "#ef4444",
    glow: "rgba(239,68,68,0.28)",
    label: "#fca5a5",
  };
}

function splitLabel(label: string, maxChars = 16) {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || current.length === 0) {
      current = next;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function layoutBubbles(topics: TopicMasteryBubble[]): {
  bubbles: PositionedBubble[];
  width: number;
  height: number;
} {
  const placed: PositionedBubble[] = [];
  const spacing = 10;

  topics.forEach((topic, index) => {
    const radius = Math.max(34, Math.min(68, 26 + topic.attempts * 2.4));

    if (index === 0) {
      placed.push({ ...topic, radius, x: 0, y: 0 });
      return;
    }

    let angle = index * 0.82;
    let spiralRadius = 12;
    let candidateX = 0;
    let candidateY = 0;

    for (let step = 0; step < 1600; step += 1) {
      candidateX = Math.cos(angle) * spiralRadius;
      candidateY = Math.sin(angle) * spiralRadius * 0.78;

      const overlapping = placed.some((bubble) => {
        const dx = bubble.x - candidateX;
        const dy = bubble.y - candidateY;
        const minDistance = bubble.radius + radius + spacing;
        return dx * dx + dy * dy < minDistance * minDistance;
      });

      if (!overlapping) break;

      angle += 0.32;
      spiralRadius += 0.9;
    }

    placed.push({ ...topic, radius, x: candidateX, y: candidateY });
  });

  const bounds = placed.reduce(
    (acc, bubble) => ({
      minX: Math.min(acc.minX, bubble.x - bubble.radius),
      maxX: Math.max(acc.maxX, bubble.x + bubble.radius),
      minY: Math.min(acc.minY, bubble.y - bubble.radius),
      maxY: Math.max(acc.maxY, bubble.y + bubble.radius),
    }),
    { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  );

  const padding = 48;
  const width = Math.max(760, bounds.maxX - bounds.minX + padding * 2);
  const height = Math.max(520, bounds.maxY - bounds.minY + padding * 2);

  return {
    width,
    height,
    bubbles: placed.map((bubble) => ({
      ...bubble,
      x: bubble.x - bounds.minX + padding,
      y: bubble.y - bounds.minY + padding,
    })),
  };
}

export function StudentTopicMasteryPanel({
  totalSolved,
  totalSubmissions,
  acceptanceRate,
  coveragePercent,
  difficultyBreakdown,
  topics,
}: {
  totalSolved: number;
  totalSubmissions: number;
  acceptanceRate: number;
  coveragePercent: number;
  difficultyBreakdown: DifficultyBreakdown;
  topics: TopicMasteryBubble[];
}) {
  const graphModel = useMemo(() => layoutBubbles(topics.slice(0, 24)), [topics]);

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-[#232323] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[13px] font-medium text-white/60">Total Solved</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <p className="text-5xl font-semibold tracking-tight text-[#3b82f6]">{totalSolved}</p>
              <p className="pb-1 text-xl text-[#60a5fa]">Problems</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Coverage</p>
            <p className="mt-2 text-2xl font-semibold text-white">{coveragePercent.toFixed(1)}%</p>
            <p className="text-xs text-white/50">Across the saved question bank</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <DifficultyPill label="Easy" value={difficultyBreakdown.easy} tone="#14b8a6" />
          <DifficultyPill label="Med." value={difficultyBreakdown.medium} tone="#facc15" />
          <DifficultyPill label="Hard" value={difficultyBreakdown.hard} tone="#f43f5e" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
        <MetricPanel
          label="Submissions"
          value={totalSubmissions.toString()}
          detail="Total answers attempted"
          accent="#c084fc"
          icon={<CircleDot className="h-5 w-5" />}
        />
        <MetricPanel
          label="Acceptance"
          value={`${acceptanceRate}%`}
          detail="Overall answer accuracy"
          accent="#22c55e"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <div className="rounded-[28px] border border-white/10 bg-[#232323] p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Target className="h-4 w-4 text-[#86efac]" />
                Topic Mastery Map
              </div>
              <p className="mt-1 text-sm text-white/55">
                Bubble size shows attempts. Color shows mastery. Labels stay visible on the graph.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <LegendChip color="#22c55e" label="Strong" />
              <LegendChip color="#f59e0b" label="Developing" />
              <LegendChip color="#ef4444" label="Needs work" />
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-[#1d1d1d] p-4">
            {topics.length === 0 ? (
              <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-white/50">
                Solve more questions to populate your topic mastery graph.
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${graphModel.width} ${graphModel.height}`}
                className="h-[460px] w-full"
                role="img"
                aria-label="Student topic mastery graph"
              >
                <defs>
                  {graphModel.bubbles.map((bubble) => {
                    const color = getStatusColor(bubble.status, bubble.accuracy);
                    return (
                      <radialGradient id={`bubble-glow-${bubble.id}`} key={bubble.id}>
                        <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                        <stop offset="78%" stopColor="#4b4b4b" />
                        <stop offset="100%" stopColor={color.glow} />
                      </radialGradient>
                    );
                  })}
                </defs>

                {graphModel.bubbles.map((bubble) => {
                  const color = getStatusColor(bubble.status, bubble.accuracy);
                  const labelLines = splitLabel(bubble.label, bubble.radius > 48 ? 14 : 11);
                  const fontSize = bubble.radius > 56 ? 13 : bubble.radius > 44 ? 11.5 : 10;

                  return (
                    <g key={bubble.id} transform={`translate(${bubble.x}, ${bubble.y})`}>
                      <title>{`${bubble.label}
Subject: ${bubble.subjectLabel}
Accuracy: ${bubble.accuracy}%
Attempts: ${bubble.attempts}`}</title>
                      <circle
                        r={bubble.radius}
                        fill={`url(#bubble-glow-${bubble.id})`}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1.6"
                      />
                      <line
                        x1={-bubble.radius * 0.58}
                        x2={bubble.radius * 0.58}
                        y1={bubble.radius * 0.62}
                        y2={bubble.radius * 0.62}
                        stroke={color.accent}
                        strokeWidth={4}
                        strokeLinecap="round"
                      />
                      {labelLines.map((line, index) => (
                        <text
                          key={`${bubble.id}-${line}-${index}`}
                          x={0}
                          y={(index - (labelLines.length - 1) / 2) * (fontSize + 3)}
                          textAnchor="middle"
                          fontSize={fontSize}
                          fontWeight={600}
                          fill={color.label}
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-white/45">
            <Sparkles className="h-3.5 w-3.5 text-[#86efac]" />
            Top {Math.min(topics.length, 24)} topics ranked by attempts from your saved progress.
          </div>
        </div>
      </div>
    </section>
  );
}

function DifficultyPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-semibold" style={{ color: tone }}>{label}</span>
        <span className="text-2xl font-semibold text-white">{value}</span>
      </div>
    </div>
  );
}

function MetricPanel({
  label,
  value,
  detail,
  accent,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#232323] p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-white/60">{label}</p>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="mt-4 text-5xl font-semibold tracking-tight" style={{ color: accent }}>{value}</p>
      <p className="mt-2 text-xs text-white/45">{detail}</p>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
