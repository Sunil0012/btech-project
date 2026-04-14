import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeacherAuth } from "@/contexts/AuthContext";

interface TeacherSidebarProps {
  teacherCode?: string | null;
  onNavigate?: () => void;
}

const navigation = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher/courses", label: "Courses", icon: BookOpen },
  { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/teacher/students", label: "Students", icon: Users },
  { to: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/teacher/settings", label: "Settings", icon: Settings },
];

export function TeacherSidebar({ teacherCode, onNavigate }: TeacherSidebarProps) {
  const location = useLocation();
  const { profile, signOut } = useTeacherAuth();

  return (
    <aside className="flex h-full flex-col items-center border-r border-slate-800/70 bg-[linear-gradient(180deg,#173b78,#0f2551_38%,#08172e_100%)] px-3 py-5 text-white">
      <Link to="/teacher/dashboard" onClick={onNavigate} className="flex flex-col items-center gap-2">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[1.25rem] bg-white/12 text-white shadow-lg shadow-black/20">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold leading-4 text-white">Classroom</p>
          <p className="text-[10px] leading-4 text-slate-300">Admin</p>
        </div>
      </Link>

      <nav className="mt-8 flex flex-col gap-2">
        {navigation.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={item.label}
              className={`flex w-[76px] flex-col items-center gap-2 rounded-[1.35rem] px-2 py-3 text-center text-[11px] font-medium transition-colors ${
                active
                  ? "bg-white text-slate-950 shadow-lg shadow-black/15"
                  : "text-slate-200 hover:bg-white/8 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-3">
        <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-3 py-2 text-center">
          <p className="text-[11px] font-semibold leading-4 text-white">{profile?.full_name || profile?.email?.split("@")[0] || "Teacher"}</p>
          <p className="mt-1 text-[10px] leading-4 text-slate-300">{teacherCode || "Create a course to share invites"}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={() => void signOut()}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
