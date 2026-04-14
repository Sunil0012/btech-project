import { ChevronRight, Flame, Trophy } from "lucide-react";
import type { TeacherStudentSummary } from "@/lib/teacherAnalytics";

interface TeacherRosterTableProps {
  students: TeacherStudentSummary[];
  onSelectStudent?: (student: TeacherStudentSummary) => void;
  onRemoveStudent?: (student: TeacherStudentSummary) => void;
  removingStudentId?: string | null;
}

export function TeacherRosterTable({ students, onSelectStudent, onRemoveStudent, removingStudentId }: TeacherRosterTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-primary/10 text-left text-foreground">
            <tr>
              <th className="px-5 py-4 font-medium">Learner</th>
              <th className="px-5 py-4 font-medium">Courses</th>
              <th className="px-5 py-4 font-medium">Solved</th>
              <th className="px-5 py-4 font-medium">Accuracy</th>
              <th className="px-5 py-4 font-medium">Completion</th>
              <th className="px-5 py-4 font-medium">ELO</th>
              <th className="px-5 py-4 font-medium">Last Active</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.userId} className="border-t border-border/70 transition-colors hover:bg-muted/25">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-1 rounded-full ${
                        student.riskLevel === "high"
                          ? "bg-rose-500"
                          : student.riskLevel === "medium"
                            ? "bg-orange-500"
                            : "bg-emerald-500"
                      }`}
                    />
                    <div>
                      <p className="font-semibold text-foreground">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email || "No email available"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{student.courseTitles.join(", ") || "No courses"}</td>
                <td className="px-5 py-4 font-medium text-foreground">{student.questionsSolved}</td>
                <td className="px-5 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{student.accuracy}%</span>
                      <span>{student.weakTopics[0] || "Balanced"}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${
                          student.accuracy >= 75 ? "bg-emerald-500" : student.accuracy >= 50 ? "bg-orange-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.max(student.accuracy, 4)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{student.assignmentsCompleted}/{student.assignmentsAssigned}</span>
                      <span>{student.completionRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${
                          student.riskLevel === "high"
                            ? "bg-rose-500"
                            : student.riskLevel === "medium"
                              ? "bg-orange-500"
                              : "bg-sky-500"
                        }`}
                        style={{ width: `${Math.max(student.completionRate, 4)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Trophy className="h-4 w-4 text-orange-500" />
                    {student.eloRating}
                  </span>
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Flame className="h-4 w-4 text-sky-600" />
                    {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : "No recent signal"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/5"
                      onClick={() => onSelectStudent?.(student)}
                    >
                      Open profile
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    {onRemoveStudent && (
                      <button
                        type="button"
                        className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                        onClick={() => onRemoveStudent(student)}
                        disabled={removingStudentId === student.userId}
                      >
                        {removingStudentId === student.userId ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                  Learners will appear here after they join a teacher course.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
