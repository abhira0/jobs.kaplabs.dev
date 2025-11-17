import type { Job } from "@/types/job";

export type SortSpec = {
  column: "date_posted" | "company_name" | "title" | "locations" | "active";
  order: "asc" | "desc";
};

function getValueForSort(job: Job, column: SortSpec["column"]) {
  switch (column) {
    case "date_posted":
      return new Date(job.date_posted).getTime();
    case "company_name":
    case "title":
    case "locations":
      return String(job[column] ?? "").toLowerCase();
    case "active":
      return Boolean(job.active);
    default:
      return "";
  }
}

export function applySorts(jobs: Job[], activeSorts: SortSpec[] | undefined): Job[] {
  if (!Array.isArray(jobs)) return [];
  if (!activeSorts?.length) return jobs;

  return [...jobs].sort((a, b) => {
    for (const sort of activeSorts) {
      const aValue = getValueForSort(a, sort.column);
      const bValue = getValueForSort(b, sort.column);
      if (aValue === bValue) continue;
      const dir = sort.order === "asc" ? 1 : -1;
      if (aValue == null) return dir;
      if (bValue == null) return -dir;
      return aValue < bValue ? -dir : dir;
    }
    return 0;
  });
}



