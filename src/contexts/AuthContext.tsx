import type { ReactNode } from "react";
import { StudentAuthProvider, useStudentAuth } from "@/contexts/StudentAuthContext";
import { TeacherAuthProvider, useTeacherAuth } from "@/contexts/TeacherAuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <StudentAuthProvider>
      <TeacherAuthProvider>{children}</TeacherAuthProvider>
    </StudentAuthProvider>
  );
}

export { StudentAuthProvider, TeacherAuthProvider, useStudentAuth, useTeacherAuth };
