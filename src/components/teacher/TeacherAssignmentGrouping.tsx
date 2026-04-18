/**
 * Assignment Grouping Helper Component for Teacher Assignments Page
 * Provides better visual grouping for:
 * - Due Soon
 * - Low Response
 * - Recent Submissions
 * - Assignment Status
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

export interface AssignmentGroup {
  id: string;
  title: string;
  courseTitle: string;
  dueAt: Date | null;
  completionRate: number;
  submissionCount: number;
  studentCount: number;
  subject?: string;
}

export interface AssignmentGroupingSectionProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  tone: "primary" | "warning" | "destructive" | "success";
  assignments: AssignmentGroup[];
  emptyMessage?: string;
  showDeadline?: boolean;
  showCompletion?: boolean;
}

export function AssignmentGroupingSection({
  title,
  icon,
  description,
  tone,
  assignments,
  emptyMessage = "No assignments in this group",
  showDeadline = false,
  showCompletion = true,
}: AssignmentGroupingSectionProps) {
  const toneClasses = {
    primary: "border-primary/20 bg-primary/5",
    warning: "border-warning/20 bg-warning/5",
    destructive: "border-destructive/20 bg-destructive/5",
    success: "border-success/20 bg-success/5",
  };

  const toneBadgeClasses = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  };

  if (assignments.length === 0) {
    return (
      <div className={`rounded-xl border ${toneClasses[tone]} p-6 text-center`}>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-5 w-5">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <Badge variant="outline">{assignments.length}</Badge>
      </div>

      <div className="space-y-2">
        {assignments.map((assignment) => (
          <div key={assignment.id} className={`rounded-lg border ${toneClasses[tone]} p-4 hover:bg-opacity-7 transition-colors`}>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <Link
                  to={`/teacher/assignments/${assignment.id}`}
                  className="font-medium text-sm hover:underline"
                >
                  {assignment.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">{assignment.courseTitle}</p>
              </div>
              {assignment.subject && (
                <Badge variant="secondary" className="text-xs">
                  {assignment.subject}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {showDeadline && assignment.dueAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>{assignment.dueAt.toLocaleDateString()}</span>
                </div>
              )}

              {showCompletion && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        assignment.completionRate >= 75
                          ? "bg-success"
                          : assignment.completionRate >= 50
                          ? "bg-warning"
                          : "bg-destructive"
                      }`}
                      style={{ width: `${assignment.completionRate}%` }}
                    />
                  </div>
                  <span className="font-medium">{assignment.completionRate}%</span>
                </div>
              )}

              {assignment.submissionCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {assignment.submissionCount} of {assignment.studentCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssignmentGroupingLayout({
  dueSoon,
  lowResponse,
  recentSubmissions,
}: {
  dueSoon: AssignmentGroup[];
  lowResponse: AssignmentGroup[];
  recentSubmissions: AssignmentGroup[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <AssignmentGroupingSection
          title="Due Soon"
          icon={<CalendarClock className="h-5 w-5 text-warning" />}
          description="These assignments need student attention within 7 days"
          tone="warning"
          assignments={dueSoon}
          showDeadline
          showCompletion
        />

        <AssignmentGroupingSection
          title="Low Response Rate"
          icon={<AlertCircle className="h-5 w-5 text-destructive" />}
          description="Send a reminder to students who haven't submitted yet"
          tone="destructive"
          assignments={lowResponse}
          showCompletion
        />
      </div>

      <div className="space-y-6">
        <AssignmentGroupingSection
          title="Recent Submissions"
          icon={<CheckCircle2 className="h-5 w-5 text-success" />}
          description="Latest work from your students - click to review"
          tone="success"
          assignments={recentSubmissions}
          showCompletion
        />
      </div>
    </div>
  );
}
