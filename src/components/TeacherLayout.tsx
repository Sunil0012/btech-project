import { useState, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useTeacherAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function TeacherLayout({ children }: { children: ReactNode }) {
  const { user, teacherCourses, profile, refreshClassroom, classroomError, classroomReady } = useTeacherAuth();
  const [repairingWorkspace, setRepairingWorkspace] = useState(false);
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const handleRepairWorkspace = async () => {
    setRepairingWorkspace(true);

    try {
      await refreshClassroom();
      toast({
        title: "Teacher workspace refreshed",
        description: "Course creation and classroom monitoring tools are available again.",
      });
    } catch (error) {
      toast({
        title: "Teacher workspace still needs repair",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRepairingWorkspace(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="teacher-portal bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.10),_transparent_28%),radial-gradient(circle_at_top_right,_hsl(var(--accent)/0.08),_transparent_26%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.18))] pb-10">
        <div className="container space-y-5 py-6 md:py-8">
          {user && !classroomReady && classroomError && (
            <div className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-3">
                  <p>
                    The teacher workspace needs repair before course tools can load.
                  </p>
                  <p className="text-xs leading-5 text-amber-800">
                    {classroomError.message}
                  </p>
                  <Button type="button" variant="outline" size="sm" className="gap-2 border-amber-300 bg-white hover:bg-amber-100" onClick={() => void handleRepairWorkspace()} disabled={repairingWorkspace}>
                    <RefreshCw className={`h-4 w-4 ${repairingWorkspace ? "animate-spin" : ""}`} />
                    {repairingWorkspace ? "Retrying..." : "Retry provisioning"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}
