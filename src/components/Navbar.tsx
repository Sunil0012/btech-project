import { Link, useLocation } from "react-router-dom";
import { BookOpen, BarChart3, GraduationCap, Menu, X, LogIn, LogOut, User, Settings, Moon, Sun, Brain, ClipboardList, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecentActivityDropdown } from "@/components/RecentActivityDropdown";
import { useStudentAuth, useTeacherAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useState } from "react";

interface ActivityItem {
  id: string;
  label: string;
  detail: string;
  timestamp?: string;
}

interface NavbarProps {
  teacherActivity?: ActivityItem[];
  activityLoading?: boolean;
}

export function Navbar({ teacherActivity = [], activityLoading = false }: NavbarProps) {
  const location = useLocation();
  const studentAuth = useStudentAuth();
  const teacherAuth = useTeacherAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const teacherRoute = location.pathname.startsWith("/teacher");
  const activeAuth = teacherRoute
    ? teacherAuth.user
      ? teacherAuth
      : studentAuth.user
        ? studentAuth
        : teacherAuth
    : studentAuth.user
      ? studentAuth
      : teacherAuth.user
        ? teacherAuth
        : studentAuth;
  const user = activeAuth.user;
  const role = teacherRoute ? (teacherAuth.user ? "teacher" : studentAuth.user ? "student" : null) : (studentAuth.user ? "student" : teacherAuth.user ? "teacher" : null);
  const signOut = activeAuth.signOut;
  const settingsPath = role === "teacher" ? "/teacher/settings" : "/settings";

  const studentLinks = [
    { to: "/subjects", label: "Subjects", icon: BookOpen },
    { to: "/practice", label: "Practice", icon: GraduationCap },
    { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { to: "/insights", label: "Insights", icon: Sparkles },
    { to: "/history", label: "History", icon: ClipboardList },
    { to: "/ai-coach", label: "Coach", icon: Brain },
  ];

  const teacherLinks = [
    { to: "/teacher/dashboard", label: "Dashboard", icon: BarChart3 },
    { to: "/teacher/courses", label: "Courses", icon: BookOpen },
    { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/teacher/students", label: "Students", icon: Users },
  ];

  const links = user ? (role === "teacher" ? teacherLinks : studentLinks) : [];

  const isActive = (path: string) => location.pathname === path;

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("dark");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? (role === "teacher" ? "/teacher/dashboard" : "/dashboard") : "/"} className="flex items-center gap-2 font-bold text-xl">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span>GateWay</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <>
              {role === "teacher" && (
                <RecentActivityDropdown activity={teacherActivity} loading={activityLoading} />
              )}
              <Link to={settingsPath}>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={role === "teacher" ? "/teacher/dashboard" : "/dashboard"}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {role === "teacher" ? "Teacher Hub" : user.user_metadata?.full_name || user.email?.split("@")[0]}
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/student/login">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Student Login
                </Button>
              </Link>
              <Link to="/teacher/login">
                <Button variant="outline" size="sm">Teacher Portal</Button>
              </Link>
              <Link to="/student/signup">
                <Button variant="hero" size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                isActive(link.to) ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
          {user && (
            <Link to={settingsPath} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
                isActive(settingsPath) ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}>
              <Settings className="h-4 w-4" /> Settings
            </Link>
          )}
          <div className="pt-2 border-t space-y-2">
            {user ? (
              <Button variant="outline" className="w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
                Logout
              </Button>
            ) : (
              <>
                <Link to="/student/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">Student Login</Button>
                </Link>
                <Link to="/teacher/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">Teacher Portal</Button>
                </Link>
                <Link to="/student/signup" onClick={() => setMobileOpen(false)}>
                  <Button variant="hero" className="w-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
