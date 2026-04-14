import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Link2, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useStudentAuth } from "@/contexts/AuthContext";
import { normalizeJoinCode } from "@/lib/classroom";
import { getCourseInviteDetails } from "@/lib/teacherSync";
import { toast } from "@/hooks/use-toast";

function StudentCourseInvitePage() {
  const { joinCode = "" } = useParams();
  const navigate = useNavigate();
  const { enrolledCourses, joinCourseByCode, loading } = useStudentAuth();
  const normalizedCode = useMemo(() => normalizeJoinCode(joinCode), [joinCode]);
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof getCourseInviteDetails>>>(null);
  const [fetching, setFetching] = useState(true);
  const [joining, setJoining] = useState(false);

  const existingEnrollment = enrolledCourses.find(
    (enrollment) => normalizeJoinCode(enrollment.course?.join_code || "") === normalizedCode
  );

  useEffect(() => {
    if (!normalizedCode) {
      setInvite(null);
      setFetching(false);
      return;
    }

    let active = true;

    void getCourseInviteDetails(normalizedCode)
      .then((result) => {
        if (active) setInvite(result);
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [normalizedCode]);

  const handleJoin = async () => {
    setJoining(true);

    try {
      await joinCourseByCode(normalizedCode);
      toast({
        title: "Course joined",
        description: "You can now access practice and assignments from your dashboard.",
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast({
        title: "Could not join course",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_28%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.18))]">
      <Navbar />
      <div className="container py-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border/70 bg-card/95 p-6 shadow-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Course invite</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Join this classroom</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Review the shared course invite below, then join to unlock practice, tests, and assignments in your student workspace.
          </p>

          <div className="mt-6 rounded-[1.75rem] border border-border/70 bg-muted/25 p-5">
            {loading || fetching ? (
              <p className="text-sm text-muted-foreground">Loading invite details...</p>
            ) : invite ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Course</p>
                  <p className="mt-2 text-2xl font-bold">{invite.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Teacher</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{invite.teacherName || "Teacher workspace"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Join code</p>
                  <p className="mt-2 text-lg font-black tracking-[0.12em]">{invite.joinCode}</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {invite.description || "Teacher-led classroom for assignments, progress tracking, and guided GATE DA practice."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-lg font-semibold">Invite not found</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  This course code or invite link does not match an active classroom. Ask your teacher to share the latest invite.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {existingEnrollment ? (
              <>
                <Button asChild variant="hero" className="gap-2">
                  <Link to="/dashboard">
                    <CheckCircle2 className="h-4 w-4" />
                    Open dashboard
                  </Link>
                </Button>
                <p className="flex items-center text-sm text-muted-foreground">
                  You already joined {existingEnrollment.course?.title || "this course"}.
                </p>
              </>
            ) : invite ? (
              <Button variant="hero" className="gap-2" onClick={() => void handleJoin()} disabled={joining}>
                <Link2 className="h-4 w-4" />
                {joining ? "Joining..." : "Join course"}
              </Button>
            ) : (
              <Button asChild variant="hero" className="gap-2">
                <Link to="/dashboard">
                  Back to dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {!existingEnrollment && (
              <Button asChild variant="outline">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentCourseInvitePage;
