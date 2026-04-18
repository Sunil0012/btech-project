import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Copy, 
  Link2, 
  BookOpen,
  ListTodo,
  MessageSquare,
  FileText,
  BarChart3,
  Users2,
  Layers3,
  CheckSquare,
  ClipboardList,
} from "lucide-react";
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

const navItems = [
  { label: "Home", icon: BookOpen },
  { label: "Modules", icon: Layers3 },
  { label: "Assignments", icon: ListTodo },
  { label: "Quizzes", icon: CheckSquare },
  { label: "Discussions", icon: MessageSquare },
  { label: "Grades", icon: BarChart3 },
  { label: "People", icon: Users2 },
  { label: "Files", icon: FileText },
  { label: "Syllabus", icon: ClipboardList },
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
    <div className="rounded-xl border bg-card shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md overflow-hidden flex flex-col h-full">
      <div className={`relative overflow-hidden bg-gradient-to-br ${theme} px-5 py-4 text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_24%)]" />
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className="inline-flex rounded-full bg-white/18 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]">
              {status === "published" ? "Published" : "Draft"}
            </span>
            <h3 className="mt-2 text-base font-bold leading-tight line-clamp-2">{title}</h3>
            <p className="mt-0.5 text-xs text-white/75">{joinCode}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-lg bg-white/12 p-1.5 text-white/90 transition-colors hover:bg-white/20 shrink-0"
            title="Copy course code"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="text-xs leading-4 text-muted-foreground line-clamp-2">
          {description || "Teacher-managed classroom for assignments, analytics, and student monitoring."}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <div className="rounded-lg border border-primary/10 bg-primary/5 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-[0.12em] text-primary/60 font-semibold">Students</p>
            <p className="text-sm font-bold text-foreground">{studentCount}</p>
          </div>
          <div className="rounded-lg border bg-muted/50 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground/60 font-semibold">Assign</p>
            <p className="text-sm font-bold text-foreground">{assignmentCount}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-[0.12em] text-emerald-700/60 font-semibold">Accur</p>
            <p className="text-sm font-bold text-emerald-950">{accuracy}%</p>
          </div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5">
            <p className="text-[8px] uppercase tracking-[0.12em] text-orange-700/60 font-semibold">Comp</p>
            <p className="text-sm font-bold text-orange-950">{completionRate}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">Course Tools</p>
          <div className="grid grid-cols-4 gap-1.5">
            {navItems.slice(0, 8).map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/40 p-1.5 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                title={label}
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[8px] font-medium text-muted-foreground leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-1.5 pt-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => void handleCopyInviteLink()}>
            <Link2 className="h-3 w-3" />
            Invite
          </Button>
          <Button asChild variant="hero" size="sm" className="gap-1 text-xs h-8">
            <Link to={href}>
              Manage
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
