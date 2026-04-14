import { ChevronRight, Flame, Trophy } from "lucide-react";
import type { TeacherStudentSummary } from "@/lib/teacherAnalytics";

interface StudentTableProps {
  students: TeacherStudentSummary[];
  onSelectStudent?: (student: TeacherStudentSummary) => void;
}

export function StudentTable({ students, onSelectStudent }: StudentTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-5 py-4 font-medium">Student</th>
              <th className="px-5 py-4 font-medium">Courses</th>
              <th className="px-5 py-4 font-medium">Questions Solved</th>
              <th className="px-5 py-4 font-medium">Accuracy</th>
              <th className="px-5 py-4 font-medium">Assignment Completion</th>
              <th className="px-5 py-4 font-medium">ELO</th>
              <th className="px-5 py-4 font-medium">Last Active</th>
              <th className="px-5 py-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.userId} className="border-t border-border/60">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.email || "No email available"}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {student.courseTitles.join(", ") || "No courses"}
                </td>
                <td className="px-5 py-4">{student.questionsSolved}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    student.accuracy >= 75
                      ? "bg-success/10 text-success"
                      : student.accuracy >= 50
                        ? "bg-accent/10 text-accent"
                        : "bg-destructive/10 text-destructive"
                  }`}>
                    {student.accuracy}%
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-1">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                      student.riskLevel === "high"
                        ? "bg-destructive/10 text-destructive"
                        : student.riskLevel === "medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                    }`}>
                      {student.completionRate}% complete
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {student.assignmentsCompleted}/{student.assignmentsAssigned} submitted
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Trophy className="h-4 w-4 text-warning" />
                    {student.eloRating}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" />
                    {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : "No recent data"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                    onClick={() => onSelectStudent?.(student)}
                  >
                    View details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                  Students will appear here after they join a course.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
