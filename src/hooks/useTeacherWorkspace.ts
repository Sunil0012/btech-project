import { useCallback, useEffect, useState } from "react";
import { useTeacherAuth } from "@/contexts/AuthContext";
import {
  fetchTeacherWorkspace,
  subscribeToClassroomChanges,
  type TeacherWorkspace,
} from "@/lib/classroomData";

const emptyWorkspace: TeacherWorkspace = {
  teacher: null,
  teacherProfile: null,
  courses: [],
  enrollments: [],
  students: [],
  activityEvents: [],
  progressRows: [],
  testHistoryRows: [],
  assignments: [],
  submissions: [],
};

export function useTeacherWorkspace() {
  const { user } = useTeacherAuth();
  const [workspace, setWorkspace] = useState<TeacherWorkspace>(emptyWorkspace);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  const refresh = useCallback(async (background = false) => {
    if (!user) {
      setWorkspace(emptyWorkspace);
      setLoading(false);
      setSyncing(false);
      setLastUpdatedAt(null);
      setError(null);
      setWorkspaceReady(false);
      return emptyWorkspace;
    }

    if (background) setSyncing(true);
    else setLoading(true);

    try {
      const data = await fetchTeacherWorkspace(user.id);
      setWorkspace(data);
      setLastUpdatedAt(new Date().toISOString());
      setError(null);
      setWorkspaceReady(Boolean(data.teacher && data.teacherProfile));
      return data;
    } catch (error) {
      const resolvedError = error instanceof Error ? error : new Error("Could not load the teacher workspace.");
      if (!background) {
        setWorkspace(emptyWorkspace);
        setLastUpdatedAt(null);
      }
      setError(resolvedError);
      setWorkspaceReady(false);
      throw resolvedError;
    } finally {
      if (background) setSyncing(false);
      else setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh(false).catch((error) => {
      console.error("Could not load teacher workspace", error);
    });
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    return subscribeToClassroomChanges(`teacher-workspace-${user.id}`, () => {
      void refresh(true).catch((error) => {
        console.warn("Could not refresh teacher workspace from realtime updates", error);
      });
    });
  }, [refresh, user]);

  return {
    workspace,
    loading,
    syncing,
    error,
    workspaceReady,
    lastUpdatedAt,
    liveUpdatesEnabled: Boolean(user),
    refresh: () => refresh(false),
  };
}
