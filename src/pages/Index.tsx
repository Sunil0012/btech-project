import { type ElementType } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { visibleSubjects } from "@/data/subjects";
import heroImage from "@/assets/hero-students.png";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  ClipboardList,
  Code,
  Database,
  GraduationCap,
  Grid3X3,
  LayoutDashboard,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

const iconMap: Record<string, ElementType> = {
  Grid3X3,
  BarChart3,
  TrendingUp,
  Brain,
  Lightbulb,
  Code,
  Database,
};

const portalCards = [
  {
    label: "Student Workspace",
    title: "Focused on learning, practice, and assigned work",
    description:
      "Students get adaptive practice, teacher-assigned coursework, study support, and a personal dashboard that stays separate from admin tools.",
    href: "/student/signup",
    cta: "Open Student Portal",
    bullets: [
      "Join at least one teacher classroom with a code",
      "Practice subjects, mocks, and guided coaching",
      "Track homework, weak areas, and progress",
    ],
    icon: GraduationCap,
  },
  {
    label: "Teacher Command Center",
    title: "Built for classroom control and student monitoring",
    description:
      "Teachers operate like admins with course management, assignment publishing, roster monitoring, course analytics, and intervention tools inspired by LMS workflows.",
    href: "/teacher/login",
    cta: "Open Teacher Portal",
    bullets: [
      "Create classrooms and share join codes",
      "Monitor assignment completion and risk learners",
      "Run analytics across courses and cohorts",
    ],
    icon: LayoutDashboard,
  },
] as const;

const workflow = [
  {
    step: "01",
    title: "Teacher creates classroom",
    description:
      "Every teacher gets a portal, then creates course-specific classrooms with their own join codes and invite links.",
    icon: ClipboardList,
  },
  {
    step: "02",
    title: "Students join with a code",
    description:
      "A student must be connected to at least one teacher classroom before the full student product unlocks, just like a real classroom flow.",
    icon: Users,
  },
  {
    step: "03",
    title: "Teacher monitors the cohort",
    description:
      "Assignments, submissions, weak topics, completion gaps, and learner risk stay visible from a teacher-first dashboard.",
    icon: ShieldCheck,
  },
] as const;

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="section-padding overflow-hidden">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div
              className="space-y-8"
              style={{ animation: "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Student Workspace + Teacher Command Center
              </div>

              <div className="space-y-5">
                <h1 className="text-3xl font-extrabold tracking-tight leading-[1.05] md:text-4xl lg:text-5xl">
                  One platform for{" "}
                  <span className="text-gradient">GATE DA learners</span>
                  {" "}and a real classroom portal for teachers.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Students practice with guided coaching, mocks, assignments, and progress tracking. Teachers run
                  courses like an LMS, publish work, watch weak-topic trends, and monitor the full
                  cohort from a separate admin-style workspace.
                </p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  "Adaptive student dashboard with coaching guidance",
                  "Teacher-only course, roster, and analytics pages",
                  "Join-code workflow inspired by classroom platforms",
                  "Separate portals so student and teacher views do not overlap",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/student/signup">
                  <Button variant="hero" size="lg" className="gap-2">
                    Start as Student <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/teacher/login">
                  <Button variant="hero-outline" size="lg" className="gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Enter Teacher Portal
                  </Button>
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Portal split", value: "2 distinct experiences" },
                  { label: "Classroom flow", value: "Join code required" },
                  { label: "Teacher control", value: "Courses, roster, analytics" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border bg-card/80 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="relative hidden lg:block"
              style={{ animation: "scale-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s forwards", opacity: 0 }}
            >
              <div className="relative overflow-hidden rounded-[2rem] border bg-card shadow-2xl">
                <img src={heroImage} alt="Students preparing for GATE DA exam" className="w-full h-auto" />
              </div>

              <div className="absolute -left-4 top-8 w-64 rounded-[1.5rem] border bg-background/95 p-4 shadow-xl backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Student View</p>
                <p className="mt-3 text-lg font-bold">Practice, assignments, coach</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Learners stay focused on studying, not classroom administration.
                </p>
              </div>

              <div className="absolute -bottom-6 right-0 w-72 rounded-[1.5rem] border bg-slate-950 p-5 text-white shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">Teacher View</p>
                <p className="mt-3 text-lg font-bold">Roster, assignments, analytics</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Teachers manage the cohort like an admin workspace inspired by Canvas and Classroom.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/25">
        <div className="container">
          <ScrollReveal>
            <div className="mx-auto mb-12 max-w-3xl text-center space-y-4">
              <h2 className="text-2xl font-bold md:text-3xl">Two purpose-built portals</h2>
              <p className="text-muted-foreground">
                The student dashboard and teacher dashboard are intentionally different, so each role
                gets the right tools instead of sharing the same UI.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-2">
            {portalCards.map((portal, index) => (
              <ScrollReveal key={portal.label} delay={index * 80}>
                <div
                  className={`rounded-[2rem] border p-5 shadow-lg ${
                    portal.label === "Teacher Command Center"
                      ? "bg-gradient-to-br from-sky-100 via-white to-orange-50 text-slate-900 dark:border-slate-700 dark:bg-[linear-gradient(135deg,rgba(10,18,30,0.96),rgba(14,23,38,0.94),rgba(19,52,89,0.72))] dark:text-white"
                      : "bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="max-w-xl">
                      <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${portal.label === "Teacher Command Center" ? "text-sky-600 dark:text-sky-300" : "text-primary"}`}>{portal.label}</p>
                      <h3 className={`mt-3 text-2xl font-black ${portal.label === "Teacher Command Center" ? "text-slate-950 dark:text-white" : "text-foreground"}`}>{portal.title}</h3>
                      <p className={`mt-3 text-sm leading-7 ${portal.label === "Teacher Command Center" ? "text-slate-700 dark:text-slate-200" : "text-muted-foreground"}`}>{portal.description}</p>
                    </div>
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${portal.label === "Teacher Command Center" ? "bg-slate-950 text-sky-500 dark:bg-slate-900 dark:text-sky-300" : "bg-background/90"}`}>
                      <portal.icon className={`h-6 w-6 ${portal.label === "Teacher Command Center" ? "" : "text-primary"}`} />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {portal.bullets.map((bullet) => (
                      <div key={bullet} className={`flex items-center gap-3 rounded-[1.3rem] border px-4 py-3 ${portal.label === "Teacher Command Center" ? "border-slate-500/30 bg-slate-900/75 dark:bg-slate-900/80" : "bg-background/80"}`}>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        <span className={`text-sm ${portal.label === "Teacher Command Center" ? "text-white" : "text-foreground/90"}`}>{bullet}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Link to={portal.href}>
                      <Button variant={portal.label === "Teacher Command Center" ? "hero-outline" : "hero"} className="gap-2">
                        {portal.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container">
          <ScrollReveal>
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-2xl md:text-3xl font-bold">GATE DA Subject Practice</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Students can still dive straight into subject practice, but now inside a classroom-aware
                ecosystem that supports teacher assignments and monitoring.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleSubjects.map((subject, index) => {
              const Icon = iconMap[subject.icon] || BookOpen;
              return (
                <ScrollReveal key={subject.id} delay={index * 80}>
                  <Link to={`/subjects/${subject.id}`} className="block group">
                    <div className="rounded-xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]">
                      <div
                        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `hsl(${subject.color} / 0.1)`, color: `hsl(${subject.color})` }}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-1 font-semibold transition-colors group-hover:text-primary">{subject.name}</h3>
                      <p className="mb-4 text-sm text-muted-foreground">{subject.description}</p>
                      <span className="flex items-center gap-1 text-sm font-medium text-primary">
                        Start Practice <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container">
          <ScrollReveal>
            <div className="mx-auto mb-12 max-w-3xl text-center space-y-4">
              <h2 className="text-2xl font-bold md:text-3xl">How the classroom loop works</h2>
              <p className="text-muted-foreground">
                The product now works like a classroom platform instead of a solo practice site.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-3">
            {workflow.map((item, index) => (
              <ScrollReveal key={item.step} delay={index * 90}>
                <div className="rounded-[2rem] border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{item.step}</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="mt-6 text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container">
          <ScrollReveal>
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-2xl md:text-3xl font-bold">Everything needed for students and teachers</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The platform supports the full loop from practice and guided feedback to classroom control,
                assignment publishing, and teacher analytics.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Target, title: "Adaptive Practice", desc: "Students solve curated questions across GATE DA subjects with difficulty that matches progress." },
              { icon: Clock, title: "Mock Tests", desc: "Timed tests and practice flows keep the learner side exam-ready." },
              { icon: Brain, title: "Study Coach", desc: "Guided recommendations and chat coaching help students recover weak areas faster." },
              { icon: ClipboardList, title: "Assignment Publishing", desc: "Teachers can create homework and assessments per course from a dedicated portal." },
              { icon: Users, title: "Roster Monitoring", desc: "Teachers track completion, risk level, weak topics, and learner momentum across classrooms." },
              { icon: Trophy, title: "Analytics and Intervention", desc: "Teacher dashboards surface course health, top performers, and who needs help next." },
            ].map((feature, index) => (
              <ScrollReveal key={feature.title} delay={index * 80}>
                <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary/5">
        <div className="container text-center">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl space-y-6">
              <h2 className="text-2xl font-bold md:text-3xl">Launch the full classroom experience</h2>
              <p className="text-lg text-muted-foreground">
                Students can practice smarter while teachers run classrooms, publish work, and monitor
                the entire batch from a separate portal.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/student/signup">
                  <Button variant="hero" size="lg" className="gap-2">
                    Student Signup <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/teacher/signup">
                  <Button variant="hero-outline" size="lg" className="gap-2">
                    Teacher Signup <GraduationCap className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
