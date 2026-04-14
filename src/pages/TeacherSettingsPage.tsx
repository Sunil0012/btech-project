import { useMemo, useState } from "react";
import { CheckCircle2, Lock, Monitor, Moon, Save, Sun, User } from "lucide-react";
import { TeacherLayout } from "@/components/TeacherLayout";
import { TeacherMetricCard } from "@/components/teacher/TeacherMetricCard";
import { TeacherWorkspaceHeader } from "@/components/teacher/TeacherWorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeacherAuth } from "@/contexts/AuthContext";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import { teacherSupabase } from "@/integrations/supabase/teacher-client";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { Link } from "react-router-dom";

function TeacherSettingsPage() {
  const { user, profile } = useTeacherAuth();
  const { workspace } = useTeacherWorkspace();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const totalStudents = useMemo(
    () => new Set(workspace.enrollments.map((enrollment) => enrollment.student_id)).size,
    [workspace.enrollments]
  );
  const averageAssignmentsPerCourse = workspace.courses.length > 0
    ? Math.round(workspace.assignments.length / workspace.courses.length)
    : 0;

  const handleSaveProfile = async () => {
    setSavingProfile(true);

    try {
      const trimmedName = fullName.trim();

      const { error: authError } = await teacherSupabase.auth.updateUser({
        data: { full_name: trimmedName },
      });
      if (authError) throw authError;

      const { error: profileError } = await teacherSupabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

      toast({
        title: "Teacher profile updated",
        description: "Your classroom identity has been refreshed.",
      });
    } catch (error) {
      toast({
        title: "Could not save profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Re-enter the same password in both fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await teacherSupabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password updated",
        description: "Your teacher account password has been changed.",
      });
    } catch (error) {
      toast({
        title: "Could not update password",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <TeacherWorkspaceHeader
          eyebrow="Teacher Settings"
          title="Manage classroom identity and access"
          description="Control how your teacher account appears to students, tune workspace appearance, and keep account security current."
          chips={[
            `${workspace.courses.length} active courses`,
            `${totalStudents} unique students`,
            workspace.courses.length > 0 ? "Course-level sharing active" : "Create a course to enable sharing",
          ]}
          aside={
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Portal summary</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This teacher workspace controls classroom identity, access, and visual preferences separately from the student learning portal.
                </p>
              </div>
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TeacherMetricCard
            label="Courses Ready"
            value={workspace.courses.length}
            detail="Each course generates its own code and invite link after creation."
            icon={User}
            tone="blue"
          />
          <TeacherMetricCard
            label="Active Courses"
            value={workspace.courses.length}
            detail="Every course has its own join code, roster, and assignment flow."
            icon={Monitor}
            tone="orange"
          />
          <TeacherMetricCard
            label="Students Reached"
            value={totalStudents}
            detail="Unique students enrolled across your teacher workspace."
            icon={Monitor}
            tone="green"
          />
          <TeacherMetricCard
            label="Assignments / Course"
            value={averageAssignmentsPerCourse}
            detail="Average number of assignments currently running per course."
            icon={Save}
            tone="rose"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Classroom identity</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Control how students see your teacher account.</p>
                </div>
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/teacher/courses?create=1">Manage courses</Link>
                </Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="mt-2 text-base font-semibold text-foreground">{user?.email || profile?.email || "No email"}</p>
                </div>
                <div className="rounded-xl border bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Course sharing</p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {workspace.courses.length > 0 ? "Per-course codes and links" : "Create a course first"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Teacher Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="rounded-2xl py-3 pl-10"
                      placeholder="Your display name"
                    />
                  </div>
                </div>

                <Button variant="hero" className="gap-2" onClick={() => void handleSaveProfile()} disabled={savingProfile}>
                  <Save className="h-4 w-4" />
                  {savingProfile ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10">
                  <Lock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Security</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Update the password for your teacher account.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="rounded-2xl py-3"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="rounded-2xl py-3"
                    placeholder="Re-enter password"
                  />
                </div>

                <Button variant="outline" className="gap-2" onClick={() => void handleChangePassword()} disabled={savingPassword || !newPassword}>
                  <Lock className="h-4 w-4" />
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Appearance</h3>
                <p className="mt-1 text-sm text-muted-foreground">Choose the theme for your teacher workspace.</p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-4">
                {[
                  { id: "light" as const, label: "Light", icon: Sun, desc: "Bright workspace" },
                  { id: "dark" as const, label: "Dark", icon: Moon, desc: "Low-light focus" },
                  { id: "system" as const, label: "System", icon: Monitor, desc: "Match device" },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTheme(option.id)}
                    className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                      theme === option.id ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    {theme === option.id && (
                      <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
                    )}
                    <option.icon className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium text-foreground">{option.label}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Workspace notes</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">Teacher portal separation</h3>
              <div className="mt-5 space-y-4 text-sm leading-6 text-muted-foreground">
                <p>This portal only contains classroom management surfaces such as courses, assignments, student tracking, analytics, and settings.</p>
                <p>The student learning flow remains separate, so this teacher site stays focused on operations and teaching decisions.</p>
                <p>Create a course when you are ready to share a join code or invite link with students.</p>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-foreground">Workspace footprint</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Courses running</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{workspace.courses.length}</p>
                </div>
                <div className="rounded-xl border bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Assignments published</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{workspace.assignments.length}</p>
                </div>
                <div className="rounded-xl border bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Students enrolled</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{totalStudents}</p>
                </div>
                <div className="rounded-xl border bg-muted/35 p-4">
                  <p className="text-sm text-muted-foreground">Submissions received</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{workspace.submissions.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </TeacherLayout>
  );
}

export default TeacherSettingsPage;
