import { useMemo, useState } from "react";
import { ArrowRight, Layers3, Plus, Sparkles, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TeacherLayout } from "@/components/TeacherLayout";
import { TeacherCourseCard } from "@/components/teacher/TeacherCourseCard";
import { TeacherWorkspaceHeader } from "@/components/teacher/TeacherWorkspaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTeacherWorkspace } from "@/hooks/useTeacherWorkspace";
import { createCourseForSignedInTeacher } from "@/lib/classroomData";
import { buildTeacherCourseSummaries } from "@/lib/teacherAnalytics";
import { toast } from "@/hooks/use-toast";

function TeacherCoursesPage() {
  const { workspace, loading, refresh } = useTeacherWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const shouldHighlightCreate = searchParams.get("create") === "1";

  const courseSummaries = useMemo(
    () =>
      buildTeacherCourseSummaries({
        courses: workspace.courses,
        enrollments: workspace.enrollments,
        assignments: workspace.assignments,
        submissions: workspace.submissions,
      }),
    [workspace.assignments, workspace.courses, workspace.enrollments, workspace.submissions]
  );
  const isEmptyState = courseSummaries.length === 0;

  const handleCreateCourse = async () => {
    if (!title.trim()) {
      toast({
        title: "Course title required",
        description: "Add a title before creating the course.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const createdCourse = await createCourseForSignedInTeacher({
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
      setShowCreateDialog(false);
      setSearchParams({}, { replace: true });
      try {
        await refresh();
      } catch (error) {
        console.warn("Course was created, but workspace refresh did not complete.", error);
      }
      toast({
        title: "Course created",
        description: "Your new classroom is ready. Share its course join code or invite link with students.",
      });
      navigate(`/teacher/courses/${createdCourse.id}`);
    } catch (error) {
      toast({
        title: "Could not create course",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <TeacherLayout>
      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {isEmptyState ? (
            <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="relative overflow-hidden rounded-[1.5rem] border border-border bg-[linear-gradient(145deg,hsl(var(--primary)/0.06)_0%,hsl(var(--background))_46%,hsl(var(--accent)/0.04)_100%)] p-8 shadow-sm">
                <div className="absolute -right-14 top-8 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl" />
                <div className="absolute bottom-0 left-10 h-32 w-32 rounded-full bg-orange-200/30 blur-3xl" />
                <div className="relative space-y-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      First Classroom
                    </div>
                    <div className="max-w-2xl space-y-4">
                      <h3 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                        Create one course and start teaching from the same portal.
                      </h3>
                      <p className="max-w-xl text-base leading-8 text-muted-foreground">
                        Your first course becomes the launch point for student joins, assignments, analytics, and roster tracking. No default classroom is created behind the scenes anymore.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border bg-card/90 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Step 1</p>
                      <p className="mt-3 text-lg font-semibold text-foreground">Name the course</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Use a cohort title your students will recognize instantly.</p>
                    </div>
                    <div className="rounded-xl border bg-card/90 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Step 2</p>
                      <p className="mt-3 text-lg font-semibold text-foreground">Publish once</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">The teacher workspace creates one isolated classroom for this batch.</p>
                    </div>
                    <div className="rounded-xl border bg-card/90 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Step 3</p>
                      <p className="mt-3 text-lg font-semibold text-foreground">Share the generated link</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Students join from their dashboard with the course code or invite link.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                        <Layers3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">What happens next</p>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                          After you create the course, we take you straight into its teacher view so you can copy the join code, open the invite link, and start building assignments right away.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-[1.5rem] border bg-card/95 p-6 shadow-sm ${shouldHighlightCreate ? "border-primary/40 ring-2 ring-primary/10" : "border-border"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Single Create Flow</p>
                    <h3 className="mt-2 text-2xl font-bold text-foreground">Publish your first course</h3>
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Course title</label>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Weekend GATE DA Cohort" className="h-12 rounded-2xl" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Tell students what this batch covers, how the class runs, and what they should expect."
                      className="min-h-[180px] rounded-[1.5rem]"
                    />
                  </div>

                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                    This single action creates the classroom, generates a unique join code, and unlocks the invite link on the next screen.
                  </div>

                  <Button variant="hero" className="h-12 w-full gap-2 rounded-2xl text-base" onClick={() => void handleCreateCourse()} disabled={creating}>
                    <Sparkles className="h-4 w-4" />
                    {creating ? "Creating classroom..." : "Create course"}
                    {!creating && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 p-5 shadow-sm flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Manage Courses</h3>
                      <p className="text-sm text-muted-foreground">Each course is an isolated classroom with its own join code, roster, and assignment stream.</p>
                    </div>
                  </div>
                </div>

                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="hero" size="lg" className="gap-2 shrink-0">
                      <Plus className="h-5 w-5" />
                      Create Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                      <DialogDescription>
                        Add a course title and optional description. A unique join code will be generated automatically.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Course title</label>
                        <Input 
                          value={title} 
                          onChange={(event) => setTitle(event.target.value)} 
                          placeholder="Weekend GATE DA Cohort"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !creating) {
                              void handleCreateCourse();
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <Textarea
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                          placeholder="Tell students what this batch covers and how the course is structured."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                        New courses get a unique join code. Students enter it in their dashboard to join.
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowCreateDialog(false);
                            setTitle("");
                            setDescription("");
                          }}
                          disabled={creating}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="hero" 
                          className="flex-1 gap-2" 
                          onClick={() => void handleCreateCourse()} 
                          disabled={creating}
                        >
                          <Sparkles className="h-4 w-4" />
                          {creating ? "Creating..." : "Create"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courseSummaries.map((course) => (
                  <TeacherCourseCard
                    key={course.id}
                    title={course.title}
                    description={course.description}
                    joinCode={course.joinCode}
                    studentCount={course.studentCount}
                    assignmentCount={course.assignmentCount}
                    accuracy={course.avgAccuracy}
                    completionRate={course.completionRate}
                    href={`/teacher/courses/${course.id}`}
                    status={course.studentCount > 0 || course.assignmentCount > 0 ? "published" : "draft"}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </TeacherLayout>
  );
}

export default TeacherCoursesPage;
