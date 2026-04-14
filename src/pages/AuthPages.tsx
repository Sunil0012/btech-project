import { useMemo, useState, type ElementType, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useStudentAuth, useTeacherAuth } from "@/contexts/AuthContext";
import { type AppRole } from "@/lib/classroom";

function formatAuthError(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Authentication failed. Please try again.";
  const message = fallback.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "This account still requires email confirmation in Supabase Auth.";
  }

  if (message.includes("user already registered")) {
    return "An account already exists for this email. Try signing in instead.";
  }

  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }

  if (message.includes("failed to fetch")) {
    return "Could not reach the selected Supabase Auth project from the browser. Check your internet connection, VPN or ad blocker, then restart the Vite server if you changed `.env`.";
  }

  if (message.includes("supabase auth is not configured")) {
    return "Supabase auth configuration is missing. Verify the `VITE_STUDENT_SUPABASE_*` or `VITE_TEACHER_SUPABASE_*` environment variables, then restart the app.";
  }

  return fallback;
}

const portalCopy = {
  student: {
    label: "Student Portal",
    headline: "Start Your GATE Journey",
    subheadline: "Adaptive practice, assignments, coaching, and progress tracking built for aspirants.",
    accentCard: "from-primary/20 via-primary/5 to-accent/10",
    icon: GraduationCap,
    bullets: [
      "Join a teacher with a classroom code",
      "Practice subject-wise and adaptive tests",
      "Track homework, due dates, and guided coaching",
    ],
    loginTitle: "Student Login",
    loginDescription: "Sign in to continue practice, open assignments, and resume your GateWay prep.",
    signupTitle: "Create Student Account",
    signupDescription: "Create your learner profile, then join a course from the dashboard with a code or invite link.",
    submitLogin: "Enter Student Portal",
    submitSignup: "Create Student Account",
    alternateRoleLabel: "Teacher",
    alternateLoginHref: "/teacher/login",
    alternateSignupHref: "/teacher/signup",
  },
  teacher: {
    label: "Teacher Portal",
    headline: "Manage Your Classroom",
    subheadline: "Run courses, assign work, monitor weak topics, and guide students like a full edtech control center.",
    accentCard: "from-accent/20 via-primary/5 to-warning/10",
    icon: BriefcaseBusiness,
    bullets: [
      "Create classrooms and share join codes",
      "Assign homework and timed practice tests",
      "Monitor accuracy, ELO, and completion trends",
    ],
    loginTitle: "Teacher Login",
    loginDescription: "Sign in to open your classroom dashboard, analytics, and assignment builder.",
    signupTitle: "Create Teacher Account",
    signupDescription: "Create your classroom workspace and build your first course after login.",
    submitLogin: "Enter Teacher Portal",
    submitSignup: "Create Teacher Workspace",
    alternateRoleLabel: "Student",
    alternateLoginHref: "/student/login",
    alternateSignupHref: "/student/signup",
  },
} satisfies Record<AppRole, {
  label: string;
  headline: string;
  subheadline: string;
  accentCard: string;
  icon: ElementType;
  bullets: string[];
  loginTitle: string;
  loginDescription: string;
  signupTitle: string;
  signupDescription: string;
  submitLogin: string;
  submitSignup: string;
  alternateRoleLabel: string;
  alternateLoginHref: string;
  alternateSignupHref: string;
}>;

function getDashboardPath(role: AppRole | null) {
  return role === "teacher" ? "/teacher/dashboard" : "/dashboard";
}

function normalizeNextPath(next: string | null) {
  if (!next) return "";
  return next.startsWith("/") ? next : "";
}

function withNext(href: string, nextPath: string) {
  return nextPath ? `${href}?next=${encodeURIComponent(nextPath)}` : href;
}

function AuthShell({
  role,
  mode,
  children,
}: {
  role: AppRole;
  mode: "login" | "signup";
  children: ReactNode;
}) {
  const copy = portalCopy[role];
  const Icon = copy.icon;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_28%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.22))]">
      <Navbar />
      <div className="container py-8 md:py-10">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className={`overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br ${copy.accentCard} p-6 shadow-2xl shadow-primary/10`}>
            <div className="flex h-full flex-col">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur">
                <Sparkles className="h-4 w-4" />
                {copy.label}
              </div>

              <div className="mt-8 max-w-xl">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-background/80 shadow-lg">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">{copy.headline}</h1>
                <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">{copy.subheadline}</p>
              </div>

              <div className="mt-8 grid gap-3">
                {copy.bullets.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.5rem] border border-background/60 bg-background/75 p-4 backdrop-blur">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm leading-6 text-foreground/90">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-8">
                <div className="rounded-[1.75rem] border border-background/60 bg-background/75 p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    {mode === "login" ? "Portal Access" : "Account Setup"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {role === "teacher"
                      ? "Teacher accounts open the classroom management workspace, while student accounts stay focused on learning and assigned work."
                      : "Student accounts unlock practice and coursework, while teacher accounts stay in a separate classroom management portal."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border/70 bg-card/95 p-5 shadow-xl backdrop-blur sm:p-6">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function PortalSwitcher({ currentRole, mode }: { currentRole: AppRole; mode: "login" | "signup" }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(["student", "teacher"] as const).map((role) => {
        const copy = portalCopy[role];
        const href = `/${role}/${mode}`;
        const Icon = copy.icon;
        const active = role === currentRole;

        return (
          <Link
            key={role}
            to={href}
            className={`rounded-[1.5rem] border p-4 transition-all ${
              active
                ? "border-primary bg-primary/6 shadow-lg shadow-primary/10"
                : "hover:border-primary/30 hover:bg-muted/30"
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/40">
              <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <p className="mt-4 font-semibold">{copy.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {role === "teacher" ? "Dashboard, courses, analytics" : "Practice, assignments, coach"}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

function ActiveSessionMismatch({
  currentRole,
  targetRole,
  mode,
}: {
  currentRole: AppRole;
  targetRole: AppRole;
  mode: "login" | "signup";
}) {
  const studentAuth = useStudentAuth();
  const teacherAuth = useTeacherAuth();
  const navigate = useNavigate();
  const currentCopy = portalCopy[currentRole];
  const targetCopy = portalCopy[targetRole];
  const activeAuth = currentRole === "teacher" ? teacherAuth : studentAuth;

  const handleSwitch = async () => {
    await activeAuth.signOut();
    navigate(`/${targetRole}/${mode}`, { replace: true });
  };

  return (
    <AuthShell role={targetRole} mode={mode}>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Active Session Detected
          </div>
          <div>
            <h2 className="text-2xl font-bold">You are already inside the {currentCopy.label}</h2>
            <p className="mt-2 text-muted-foreground">
              This page is for the {targetCopy.label.toLowerCase()}, but the current session belongs to the{" "}
              {currentCopy.label.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-muted/25 p-5">
          <p className="text-sm font-medium text-foreground">Current signed-in account</p>
          <p className="mt-2 text-sm text-muted-foreground">{activeAuth.user?.email || "Authenticated user"}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sign out first, then continue into the {targetCopy.label.toLowerCase()} using a teacher account if you
            want to see the teacher dashboard.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="hero" className="gap-2" onClick={() => void handleSwitch()}>
            <LogOut className="h-4 w-4" />
            Sign Out And Continue
          </Button>
          <Button asChild variant="outline">
            <Link to={getDashboardPath(currentRole)}>Return to {currentCopy.label}</Link>
          </Button>
        </div>

        <div className="rounded-[1.5rem] border bg-muted/25 p-4 text-sm text-muted-foreground">
          Need a new {targetCopy.label.toLowerCase()} account instead?{" "}
          <Link to={`/${targetRole}/signup`} className="font-medium text-primary hover:underline">
            Create one here
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

function LoginPortalPage({ role }: { role: AppRole }) {
  const copy = portalCopy[role];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const studentAuth = useStudentAuth();
  const teacherAuth = useTeacherAuth();
  const navigate = useNavigate();
  const targetAuth = role === "teacher" ? teacherAuth : studentAuth;
  const oppositeAuth = role === "teacher" ? studentAuth : teacherAuth;
  const currentRole = targetAuth.user ? role : oppositeAuth.user ? (role === "teacher" ? "student" : "teacher") : null;
  const authLoading = targetAuth.loading || oppositeAuth.loading;
  const user = targetAuth.user || oppositeAuth.user || null;

  const nextPath = normalizeNextPath(new URLSearchParams(window.location.search).get("next"));
  const redirectPath = useMemo(
    () => (role === "student" && nextPath ? nextPath : getDashboardPath(currentRole)),
    [currentRole, nextPath, role]
  );

  if (!authLoading && user && currentRole === role) {
    return <Navigate to={redirectPath} replace />;
  }

  if (!authLoading && user && currentRole && currentRole !== role) {
    return <ActiveSessionMismatch currentRole={currentRole} targetRole={role} mode="login" />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const nextRole = await targetAuth.signIn(email, password);
      navigate(role === "student" && nextPath ? nextPath : getDashboardPath(nextRole));
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell role={role} mode="login">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            {copy.label}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{copy.loginTitle}</h2>
            <p className="mt-2 text-muted-foreground">{copy.loginDescription}</p>
          </div>
        </div>

        <PortalSwitcher currentRole={role} mode="login" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Field label="Email" icon={Mail}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field label="Password" icon={Lock}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Password"
              required
            />
          </Field>

          <Button variant="hero" className="w-full gap-2" type="submit" disabled={loading}>
            {loading ? "Signing in..." : copy.submitLogin}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="rounded-[1.5rem] border bg-muted/25 p-4 text-sm text-muted-foreground">
          Need the {copy.alternateRoleLabel.toLowerCase()} portal instead?{" "}
          <Link to={copy.alternateRoleLabel === "Student" ? withNext(copy.alternateLoginHref, nextPath) : copy.alternateLoginHref} className="font-medium text-primary hover:underline">
            Open {copy.alternateRoleLabel} Login
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link to={role === "student" ? withNext(`/${role}/signup`, nextPath) : `/${role}/signup`} className="font-medium text-primary hover:underline">
            Create one here
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function SignupPortalPage({ role }: { role: AppRole }) {
  const copy = portalCopy[role];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [searchParams] = useSearchParams();
  const studentAuth = useStudentAuth();
  const teacherAuth = useTeacherAuth();
  const navigate = useNavigate();
  const targetAuth = role === "teacher" ? teacherAuth : studentAuth;
  const oppositeAuth = role === "teacher" ? studentAuth : teacherAuth;
  const currentRole = targetAuth.user ? role : oppositeAuth.user ? (role === "teacher" ? "student" : "teacher") : null;
  const authLoading = targetAuth.loading || oppositeAuth.loading;
  const user = targetAuth.user || oppositeAuth.user || null;

  const nextPath = normalizeNextPath(searchParams.get("next"));
  const redirectPath = useMemo(
    () => (role === "student" && nextPath ? nextPath : getDashboardPath(currentRole)),
    [currentRole, nextPath, role]
  );

  if (!authLoading && user && currentRole === role) {
    return <Navigate to={redirectPath} replace />;
  }

  if (!authLoading && user && currentRole && currentRole !== role) {
    return <ActiveSessionMismatch currentRole={currentRole} targetRole={role} mode="signup" />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = role === "teacher"
        ? await teacherAuth.signUp(email, password, name)
        : await studentAuth.signUp(email, password, name);

      if (result.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true);
        setSuccess(true);
      } else {
        navigate(role === "student" && nextPath ? nextPath : getDashboardPath(result.role));
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell role={role} mode="signup">
        <div className="flex h-full flex-col justify-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <BadgeCheck className="h-8 w-8 text-success" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold">{needsEmailConfirmation ? "Check your email" : "Account created"}</h2>
            <p className="text-muted-foreground">
              {needsEmailConfirmation
                ? `We sent a confirmation link to ${email}.`
                : role === "teacher"
                  ? "Your teacher workspace is ready."
                  : "Your student dashboard is ready."}
            </p>
          </div>

          <Button asChild variant="hero" className="w-full">
            <Link to={`/${role}/login${role === "student" && nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>Open {copy.label}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell role={role} mode="signup">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {role === "teacher" ? <BookOpen className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
            {copy.label}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{copy.signupTitle}</h2>
            <p className="mt-2 text-muted-foreground">{copy.signupDescription}</p>
          </div>
        </div>

        <PortalSwitcher currentRole={role} mode="signup" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Field label="Full Name" icon={User}>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={role === "teacher" ? "Teacher name" : "Student name"}
              required
            />
          </Field>

          <Field label="Email" icon={Mail}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@example.com"
              required
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Password" icon={Lock}>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </Field>

            <Field label="Confirm Password" icon={Lock}>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border bg-background py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Re-enter password"
                required
                minLength={6}
              />
            </Field>
          </div>

          {role === "teacher" ? (
            <div className="rounded-[1.75rem] border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-medium">Courses are created after login</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your teacher account is created first. After login, you will create courses manually and each course will get its own join code and invite link.
              </p>
            </div>
          ) : null}

          <Button variant="hero" className="w-full gap-2" type="submit" disabled={loading}>
            {loading ? "Creating account..." : copy.submitSignup}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="rounded-[1.5rem] border bg-muted/25 p-4 text-sm text-muted-foreground">
          Need the {copy.alternateRoleLabel.toLowerCase()} portal instead?{" "}
          <Link to={copy.alternateRoleLabel === "Student" ? withNext(copy.alternateSignupHref, nextPath) : copy.alternateSignupHref} className="font-medium text-primary hover:underline">
            Create {copy.alternateRoleLabel} Account
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to={`/${role}/login${role === "student" && nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`} className="font-medium text-primary hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function StudentLoginPage() {
  return <LoginPortalPage role="student" />;
}

export function StudentSignupPage() {
  return <SignupPortalPage role="student" />;
}

export function TeacherLoginPage() {
  return <LoginPortalPage role="teacher" />;
}

export function TeacherSignupPage() {
  return <SignupPortalPage role="teacher" />;
}

export function LoginPage() {
  return <Navigate to="/student/login" replace />;
}

export function SignupPage() {
  return <Navigate to="/student/signup" replace />;
}
