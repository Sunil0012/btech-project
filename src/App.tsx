import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SubjectsPage from "./pages/SubjectsPage";
import TopicNotesPage from "./pages/TopicNotesPage";
import PracticePage from "./pages/PracticePage";
import DashboardPage from "./pages/DashboardPage";
import TestHistoryPage from "./pages/TestHistoryPage";
import AICoachPage from "./pages/AICoachPage";
import SettingsPage from "./pages/SettingsPage";
import StudentCourseInvitePage from "./pages/StudentCourseInvitePage";
import {
  LoginPage,
  SignupPage,
  StudentLoginPage,
  StudentSignupPage,
  TeacherLoginPage,
  TeacherSignupPage,
} from "./pages/AuthPages";
import AssignmentAttemptPage from "./pages/AssignmentAttemptPage";
import TeacherDashboardPage from "./pages/TeacherDashboardPage";
import TeacherCoursesPage from "./pages/TeacherCoursesPage";
import TeacherCourseDetailPage from "./pages/TeacherCourseDetailPage";
import TeacherAssignmentsPage from "./pages/TeacherAssignmentsPage";
import TeacherStudentsPage from "./pages/TeacherStudentsPage";
import TeacherAnalyticsPage from "./pages/TeacherAnalyticsPage";
import TeacherSettingsPage from "./pages/TeacherSettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/student/login" element={<StudentLoginPage />} />
              <Route path="/student/signup" element={<StudentSignupPage />} />
              <Route path="/teacher/login" element={<TeacherLoginPage />} />
              <Route path="/teacher/signup" element={<TeacherSignupPage />} />
              <Route path="/student" element={<Navigate to="/student/login" replace />} />
              <Route path="/teacher" element={<Navigate to="/teacher/login" replace />} />
              <Route path="/subjects" element={<ProtectedRoute allowedRoles={["student"]} requireCourse><SubjectsPage /></ProtectedRoute>} />
              <Route path="/subjects/:subjectId" element={<ProtectedRoute allowedRoles={["student"]} requireCourse><SubjectsPage /></ProtectedRoute>} />
              <Route path="/subjects/:subjectId/:topicId/notes" element={<ProtectedRoute allowedRoles={["student"]} requireCourse><TopicNotesPage /></ProtectedRoute>} />
              <Route path="/practice" element={<ProtectedRoute allowedRoles={["student"]} requireCourse><PracticePage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["student"]}><DashboardPage /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute allowedRoles={["student"]}><TestHistoryPage /></ProtectedRoute>} />
              <Route path="/ai-coach" element={<ProtectedRoute allowedRoles={["student"]} requireCourse><AICoachPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={["student"]}><SettingsPage /></ProtectedRoute>} />
              <Route path="/assignments/:assignmentId" element={<ProtectedRoute allowedRoles={["student"]} requireCourse><AssignmentAttemptPage /></ProtectedRoute>} />
              <Route path="/join-course/:joinCode" element={<ProtectedRoute allowedRoles={["student"]}><StudentCourseInvitePage /></ProtectedRoute>} />
              <Route path="/teacher/dashboard" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboardPage /></ProtectedRoute>} />
              <Route path="/teacher/courses" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherCoursesPage /></ProtectedRoute>} />
              <Route path="/teacher/courses/:courseId" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherCourseDetailPage /></ProtectedRoute>} />
              <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAssignmentsPage /></ProtectedRoute>} />
              <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherStudentsPage /></ProtectedRoute>} />
              <Route path="/teacher/analytics" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherAnalyticsPage /></ProtectedRoute>} />
              <Route path="/teacher/settings" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherSettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
