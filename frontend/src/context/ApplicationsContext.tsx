"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/utils/api";
import { parseJwt } from "@/utils/jwt";

type ApplicationsShape = {
  applications: Record<string, { applied?: string[]; hidden?: string[] }>;
};

type ApplicationsContextValue = {
  applications: ApplicationsShape;
  getApplicationStatus: (jobId: string, type: "hidden" | "applied") => boolean;
  updateApplication: (jobId: string, type: "hidden" | "applied", value: boolean) => Promise<void>;
  username: string | null;
  setUsername: (u: string | null) => void;
};

const ApplicationsContext = createContext<ApplicationsContextValue | null>(null);

export function useApplications() {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw new Error("useApplications must be used within ApplicationsProvider");
  return ctx;
}

export function ApplicationsProvider({ children }: { children: React.ReactNode }) {
  const [applications, setApplications] = useState<ApplicationsShape>({ applications: {} });
  const [username, setUsername] = useState<string | null>(null);

  // Load applications from backend when authenticated
  useEffect(() => {
    const run = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
        if (!token) return;
        const payload = parseJwt(token);
        const uname: string | null = (payload && typeof payload.sub === 'string') ? payload.sub : (payload && typeof payload.username === 'string') ? payload.username : null;
        if (!uname) return;
        setUsername(uname);
        const res = await fetch(buildApiUrl("/applications"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as ApplicationsShape | null;

        // Also fetch tracker to unify legacy "applied" with "hidden"
        let trackerIds: string[] = [];
        try {
          const tr = await fetch(buildApiUrl("/simplify/parsed"), {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (tr.ok) {
            const tracker = (await tr.json()) as Array<{ job_posting_id?: string | number }>; // best-effort shape
            trackerIds = Array.isArray(tracker)
              ? tracker
                  .map((t: { job_posting_id?: string | number }) => (t && t.job_posting_id != null ? String(t.job_posting_id) : null))
                  .filter((x): x is string => Boolean(x))
              : [];
          }
        } catch {
          // ignore tracker failures
        }

        if (data && typeof data === "object" && "applications" in data && data.applications) {
          // Migrate/merge: ensure all "applied" ids are treated as hidden, and include tracker ids as well
          const next: ApplicationsShape = { applications: { ...(data as ApplicationsShape).applications } };
          const userApps = next.applications[uname] ?? { applied: [], hidden: [] };
          const appliedSet = new Set([...(userApps.applied ?? []), ...trackerIds]);
          const hiddenSet = new Set([...(userApps.hidden ?? []), ...appliedSet]);
          next.applications[uname] = {
            applied: Array.from(appliedSet),
            hidden: Array.from(hiddenSet),
          };
          setApplications(next);
        }
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  const getApplicationStatus = useCallback(
    (jobId: string, _type: "hidden" | "applied") => {
      if (!username) return false;
      const userApps = applications.applications[username];
      if (!userApps) return false;
      // Treat both "applied" and "hidden" as equivalent hidden state (union)
      const hiddenUnion = new Set<string>([
        ...(userApps.hidden ?? []),
        ...(userApps.applied ?? []),
      ]);
      return hiddenUnion.has(jobId);
    },
    [applications, username]
  );

  const updateApplication = useCallback(
    async (jobId: string, type: "hidden" | "applied", value: boolean) => {
      if (!username) return;

      // Optimistic update
      let previous: ApplicationsShape | null = null;
      setApplications((prev) => {
        previous = prev;
        const userApps = prev.applications[username!] ?? {};
        // Always write to both keys so they stay mirrored
        const hidden = new Set<string>(userApps.hidden ?? []);
        const applied = new Set<string>(userApps.applied ?? []);
        const sets = [hidden, applied];
        if (value) sets.forEach((s) => s.add(jobId));
        else sets.forEach((s) => s.delete(jobId));
        const next: ApplicationsShape = {
          applications: {
            ...prev.applications,
            [username!]: {
              ...userApps,
              hidden: Array.from(hidden),
              applied: Array.from(applied),
            },
          },
        };
        return next;
      });

      // Persist to backend if authenticated
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
        if (!token) return;
        const res = await fetch(buildApiUrl("/applications"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // Always persist as hidden server-side
          body: JSON.stringify({ job_id: jobId, status: "hidden", value }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data && (data.error || data.detail)) || "Failed to update application");
        if (data && typeof data === "object" && data.applications) {
          setApplications(data as ApplicationsShape);
        }
      } catch {
        // Revert on error
        if (previous) setApplications(previous);
      }
    },
    [username]
  );

  const value = useMemo<ApplicationsContextValue>(
    () => ({ applications, getApplicationStatus, updateApplication, username, setUsername }),
    [applications, getApplicationStatus, updateApplication, username]
  );

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}



