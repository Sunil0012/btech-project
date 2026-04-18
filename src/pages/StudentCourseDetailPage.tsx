import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useStudentAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useStudentAssignments } from "@/hooks/useStudentAssignments";
import { getAssignmentSubjectLabel } from "@/lib/classroom";
import { studentSupabase } from "@/integrations/supabase/student-client";
import {
  BookOpen, FileText, Users, BarChart3, FolderOpen,
  ArrowLeft, Download, Clock, CheckCircle, AlertCircle
} from "lucide-react";
import type { EnrollmentWithCourse } from "@/lib/classroom";
import type { StudentTables } from "@/integrations/supabase/student-types";

type CourseFileRow = StudentTables<"course_files">;
type EnrollmentRow = StudentTables<"enrollments">;
type ProfileRow = StudentTables<"profiles">;

export default function StudentCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { enrolledCourses } = useStudentAuth();
  const { assignments: allAssignments } = useStudentAssignments();
  
  const [activeTab, setActiveTab] = useState<"assignments" | "people" | "files" | "discussions" | "grades">(
    (searchParams.get("tab") as any) || "assignments"
  );
  const [courseStudents, setCourseStudents] = useState<(ProfileRow & { id: string })[]>([]);
  const [courseFiles, setCourseFiles] = useState<CourseFileRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const enrollment = enrolledCourses.find(e => e.course_id === courseId);
  const course = enrollment?.course;
  const courseAssignments = allAssignments.filter(a => a.course_id === courseId);

  // Load course students
  useEffect(() => {
    if (!courseId) return;
    
    const loadStudents = async () => {
      setLoadingStudents(true);
      try {
        const { data: enrollments, error: enrollError } = await studentSupabase
          .from("enrollments")
          .select("student_id")
          .eq("course_id", courseId);

        if (enrollError) throw enrollError;

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map((e: any) => e.student_id);
          const { data: profiles, error: profileError } = await studentSupabase
            .from("profiles")
            .select("*")
            .in("user_id", studentIds);

          if (profileError) throw profileError;
          setCourseStudents((profiles || []).map((p: any) => ({ ...p, id: p.user_id })));
        }
      } catch (error) {
        console.error("Failed to load students:", error);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [courseId]);

  // Load course files
  useEffect(() => {
    if (!courseId) return;

    const loadFiles = async () => {
      setLoadingFiles(true);
      try {
        const { data: files, error } = await studentSupabase
          .from("course_files")
          .select("*")
          .eq("course_id", courseId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCourseFiles(files || []);
      } catch (error) {
        console.error("Failed to load files:", error);
      } finally {
        setLoadingFiles(false);
      }
    };

    loadFiles();
  }, [courseId]);
  
  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container py-8 flex-1">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Course not found</h1>
            <Link to="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const tabs = [
    { id: "assignments" as const, label: "Assignments", icon: BookOpen },
    { id: "people" as const, label: "People", icon: Users },
    { id: "files" as const, label: "Files", icon: FolderOpen },
    { id: "discussions" as const, label: "Discussions", icon: FileText },
    { id: "grades" as const, label: "Grades", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container py-6 flex-1">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl border p-8 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Course Code
                </p>
                <p className="text-4xl font-bold font-mono mb-4">{course.join_code || "—"}</p>
                <h1 className="text-3xl font-bold">{course.title || "Untitled Course"}</h1>
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-muted-foreground mb-4">{course.description || "No description provided."}</p>
                {enrollment && (
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(enrollment.joined_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 border-b overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {/* Assignments Tab */}
          {activeTab === "assignments" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Course Assignments</h2>
              
              {courseAssignments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No assignments for this course yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courseAssignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      to={`/assignments/${assignment.id}`}
                      className="block group"
                    >
                      <div className="rounded-lg border bg-muted/30 p-5 hover:bg-muted/50 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {getAssignmentSubjectLabel(assignment)}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1.5 text-xs font-medium flex-shrink-0 ${
                            assignment.submission
                              ? "bg-success/10 text-success flex items-center gap-1"
                              : "bg-warning/10 text-warning flex items-center gap-1"
                          }`}>
                            {assignment.submission ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Submitted
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                Pending
                              </>
                            )}
                          </span>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {assignment.due_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Due {new Date(assignment.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <Button
                            variant={assignment.submission ? "outline" : "hero"}
                            size="sm"
                            className="gap-2"
                          >
                            {assignment.submission ? "Review" : "Attempt"}
                          </Button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* People Tab */}
          {activeTab === "people" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Course Members</h2>
              
              {loadingStudents ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading students...
                </div>
              ) : courseStudents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No students enrolled in this course yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courseStudents.map((student) => (
                    <div key={student.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {(student.full_name || "S")[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.full_name || "Student"}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.email || "No email"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Course Files</h2>
              
              {loadingFiles ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading files...
                </div>
              ) : courseFiles.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No files shared for this course yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate group-hover:text-primary">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(file.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discussions Tab */}
          {activeTab === "discussions" && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">Discussions feature coming soon</p>
              <p className="text-sm text-muted-foreground">Stay tuned for collaborative discussion boards!</p>
            </div>
          )}

          {/* Grades Tab */}
          {activeTab === "grades" && (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">Grades view coming soon</p>
              <p className="text-sm text-muted-foreground">Your grades will appear here once assignments are graded.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
