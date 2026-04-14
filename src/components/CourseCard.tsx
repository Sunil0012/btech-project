import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CourseCardProps {
  title: string;
  description?: string | null;
  joinCode: string;
  studentCount?: number;
  assignmentCount?: number;
  href?: string;
  ctaLabel?: string;
}

export function CourseCard({
  title,
  description,
  joinCode,
  studentCount,
  assignmentCount,
  href,
  ctaLabel = "Open course",
}: CourseCardProps) {
  const content = (
    <Card className="h-full rounded-3xl border-border/70 bg-card/90 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Code {joinCode}
          </span>
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-2 leading-6">
            {description || "Teacher-managed classroom for assignments, progress, and analytics."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="mt-1 text-lg font-semibold">{studentCount ?? 0}</p>
          </div>
          <div className="rounded-2xl border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Assignments</p>
            <p className="mt-1 text-lg font-semibold">{assignmentCount ?? 0}</p>
          </div>
        </div>

        {href ? (
          <Button asChild variant="hero" className="w-full gap-2">
            <Link to={href}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Classroom ready to share with students.
          </div>
        )}
      </CardContent>
    </Card>
  );

  return content;
}
