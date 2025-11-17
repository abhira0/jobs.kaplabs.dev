import type { Job } from "@/types/job";

export type TextCondition =
  | { type: "contains"; value: string }
  | { type: "equals"; value: string }
  | { type: "not-equals"; value: string }
  | { type: "not-contains"; value: string }
  | { type: "regex"; value: string }
  | { type: "not-regex"; value: string };

export type ActiveFilter =
  | { column: "date_posted"; fromDate?: string; toDate?: string }
  | { column: "hidden"; hidden: boolean }
  | { column: "applied"; applied: boolean }
  | { column: "active"; active: boolean }
  | {
      column: "company_name" | "title" | "locations";
      conditions: TextCondition[];
      conditionType: "AND" | "OR";
    };

export const applyFilters = (
  jobs: Job[],
  activeFilters: ActiveFilter[] | undefined,
  getApplicationStatus: (jobId: string, type: "hidden" | "applied") => boolean,
): Job[] => {
  if (!activeFilters || activeFilters.length === 0) return jobs;

  return jobs.filter((job) => {
    return activeFilters.every((filter) => {
      switch (filter.column) {
        case "date_posted": {
          const jobDate = new Date(job.date_posted);
          const fromDate = filter.fromDate
            ? new Date(filter.fromDate)
            : new Date(-8640000000000000);
          const toDate = filter.toDate
            ? new Date(filter.toDate)
            : new Date(8640000000000000);
          return jobDate >= fromDate && jobDate <= toDate;
        }
        case "hidden": {
          // Treat legacy "applied" as hidden-equivalent for filtering
          const isHidden = getApplicationStatus(job.id, "hidden") || getApplicationStatus(job.id, "applied");
          return filter.hidden === isHidden;
        }
        case "active":
          return filter.active === job.active;
        // Backward compatibility: treat "applied" like hidden-equivalent
        case "applied": {
          const wanted = (filter as ActiveFilter & { applied?: boolean }).applied === true;
          const isHidden = getApplicationStatus(job.id, "hidden") || getApplicationStatus(job.id, "applied");
          return wanted === isHidden;
        }
        default: {
          const jobKey = (filter as ActiveFilter & { column: keyof Job }).column;
          const text = String(job[jobKey] ?? "").toLowerCase();
          const conditions = Array.isArray((filter as ActiveFilter & { conditions?: TextCondition[] }).conditions)
            ? (filter as ActiveFilter & { conditions: TextCondition[] }).conditions
            : [];
          if (conditions.length === 0) return true;

          const evaluate = (c: TextCondition) => {
            const cv = String(c.value ?? "").toLowerCase();
            switch (c.type) {
              case "contains":
                return text.includes(cv);
              case "equals":
                return text === cv;
              case "not-equals":
                return text !== cv;
              case "not-contains":
                return !text.includes(cv);
              case "regex":
                try {
                  return new RegExp(cv, "i").test(text);
                } catch {
                  return false;
                }
              case "not-regex":
                try {
                  return !new RegExp(cv, "i").test(text);
                } catch {
                  return true;
                }
              default:
                return true;
            }
          };

          const conditionType = (filter as ActiveFilter & { conditionType?: string }).conditionType === "AND" ? "AND" : "OR";
          return conditionType === "AND"
            ? conditions.every(evaluate)
            : conditions.some(evaluate);
        }
      }
    });
  });
};



