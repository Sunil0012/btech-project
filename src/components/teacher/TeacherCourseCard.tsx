import { Link } from "react-router-dom";
import { ArrowRight, Copy, Link2, MoreVertical, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { buildCourseInviteLink } from "@/lib/classroom";

interface TeacherCourseCardProps {
  title: string;
  description?: string | null;
  joinCode: string;
  studentCount: number;
  assignmentCount: number;
  accuracy: number;
  completionRate: number;
  href: string;
  status?: "published" | "draft";
}

const bannerThemes = [
  "from-violet-600 via-violet-500 to-fuchsia-400",
  "from-sky-600 via-cyan-500 to-blue-300",
  "from-emerald-600 via-teal-500 to-lime-300",
  "from-slate-700 via-slate-600 to-slate-400",
  "from-orange-600 via-amber-500 to-yellow-300",
];

export function TeacherCourseCard({
  title,
  description,
  joinCode,
  studentCount,
  assignmentCount,
  accuracy,
  completionRate,
  href,
  status = "published",
}: TeacherCourseCardProps) {
  const theme = bannerThemes[
    Math.abs(joinCode.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % bannerThemes.length
  ];
  const inviteLink = typeof window === "undefined" ? "" : buildCourseInviteLink(window.location.origin, joinCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      toast({
        title: "Course code copied",
        description: "Share it with students to join this classroom.",
      });
    } catch {
      toast({
        title: "Could not copy course code",
        description: "Please copy the join code manually.",
        variant: "destructive",
      });
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Invite link copied",
        description: "Share it with students to join this course directly.",
      });
    } catch {
      toast({
        title: "Could not copy invite link",
        description: "Please copy the invite link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${theme} px-4 py-4 text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_24%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
              {status === "published" ? "Published" : "Needs setup"}
            </span>
            <h3 className="mt-4 text-xl font-bold leading-tight">{title}</h3>
            <p className="mt-1 text-xs text-white/80">{joinCode}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-full bg-white/12 p-2 text-white/90 transition-colors hover:bg-white/20"
            title="Copy course code"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative mt-10 flex items-center justify-end">
          <MoreVertical className="h-4 w-4 text-white/80" />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {description || "Teacher-managed classroom for assignments, analytics, and student monitoring."}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-foreground">
          <p className="text-xs uppercase tracking-[0.18em] text-primary">Students</p>
          <p className="mt-2 text-2xl font-bold">{studentCount}</p>
        </div>
        <div className="rounded-xl border bg-muted/50 px-4 py-3 text-foreground">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assignments</p>
          <p className="mt-2 text-2xl font-bold">{assignmentCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Avg Accuracy</p>
          <p className="mt-2 text-2xl font-bold">{accuracy}%</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-950">
          <p className="text-xs uppercase tracking-[0.18em] text-orange-700">Completion</p>
          <p className="mt-2 text-2xl font-bold">{completionRate}%</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Users2 className="h-4 w-4 text-sky-600" />
          Classroom ready for tracking and assignment delivery.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void handleCopyInviteLink()}>
            <Link2 className="h-4 w-4" />
            Copy link
          </Button>
          <Button asChild variant="hero" className="gap-2">
            <Link to={href}>
              Open Course
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
