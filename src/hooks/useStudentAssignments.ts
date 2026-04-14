import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudentAuth } from "@/contexts/AuthContext";
import type { AssignmentSummary } from "@/lib/classroom";
import { listStudentAssignments } from "@/lib/teacherSync";

export function useStudentAssignments() {
  const { user } = useStudentAuth();
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async (background = false) => {
    if (!user) {
      setAssignments([]);
      setLoading(false);
      setSyncing(false);
      setLastUpdatedAt(null);
      return;
    }

    if (background) setSyncing(true);
    else setLoading(true);

    try {
      const data = await listStudentAssignments(user.id);
      setAssignments(data);
      setLastUpdatedAt(new Date().toISOString());
    } finally {
      if (background) setSyncing(false);
      else setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      void refresh(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refresh, user]);

  const pendingAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.submission),
    [assignments]
  );

  return {
    assignments,
    pendingAssignments,
    nextAssignment: pendingAssignments[0] || null,
    loading,
    syncing,
    lastUpdatedAt,
    liveUpdatesEnabled: Boolean(user),
    refresh: () => refresh(false),
  };
}
