import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldAlert, Users } from "lucide-react";
import { JoinCourseModal } from "@/components/JoinCourseModal";
import { Button } from "@/components/ui/button";
import { useStudentAuth, useTeacherAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/classroom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireCourse?: boolean;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requireCourse = false,
}: ProtectedRouteProps) {
  const location = useLocation();
  const studentAuth = useStudentAuth();
  const teacherAuth = useTeacherAuth();
  const teacherRoute = allowedRoles?.includes("teacher") || location.pathname.startsWith("/teacher");
  const auth = teacherRoute ? teacherAuth : studentAuth;
  const otherAuth = teacherRoute ? studentAuth : teacherAuth;
  const role = teacherRoute ? "teacher" : "student";

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    if (otherAuth.user) {
      return <Navigate to={teacherRoute ? "/dashboard" : "/teacher/dashboard"} replace />;
    }

    const nextPath = `${location.pathname}${location.search}`;
    const studentLoginPath = `/student/login?next=${encodeURIComponent(nextPath)}`;
    return <Navigate to={teacherRoute ? "/teacher/login" : studentLoginPath} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={teacherRoute ? "/teacher/dashboard" : "/dashboard"} replace />;
  }

  if (!teacherRoute && requireCourse && !studentAuth.hasRequiredCourse) {
    return <JoinTeacherGate returnTo={`${location.pathname}${location.search}`} />;
  }

  return <>{children}</>;
}

function JoinTeacherGate({ returnTo }: { returnTo: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.10),_transparent_34%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.2))] px-4">
      <div className="max-w-xl rounded-[2rem] border border-border/70 bg-card/95 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Join a Teacher to Continue</h1>
        <p className="mt-3 text-muted-foreground">
          Your dashboard and settings stay available, but practice features unlock only after you join at least one classroom. Enter a course code or invite link to continue.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <JoinCourseModal triggerLabel="Join with code or link" onJoined={() => navigate(returnTo, { replace: true })} />
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <ShieldAlert className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
