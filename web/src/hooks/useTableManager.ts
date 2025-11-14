import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "@/types/job";
import { applyFilters, type ActiveFilter } from "@/utils/filters";
import { applySorts, type SortSpec } from "@/utils/sorts";
import { useApplications } from "@/context/ApplicationsContext";
import config from "@/config";

export type UseTableManagerReturn = {
  paginatedData: Job[];
  pageSize: number;
  setPageSize: (value: number) => void;
  page: number;
  totalPages: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (newPage: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchMode: "exact" | "fuzzy";
  setSearchMode: (mode: "exact" | "fuzzy") => void;
  searchField: "all" | "company_name" | "title" | "locations";
  setSearchField: (field: "all" | "company_name" | "title" | "locations") => void;
  searchInFiltered: boolean;
  setSearchInFiltered: (v: boolean) => void;
  activeFilters: ActiveFilter[];
  setActiveFilters: (f: ActiveFilter[]) => void;
  activeSorts: SortSpec[];
  setActiveSorts: (s: SortSpec[]) => void;
  resetFilters: () => void;
  resetSorts: () => void;
  clearAll: () => void;
  totalCount: number;
  searchedData: Job[];
};

export function useTableManager(initialData: Job[]): UseTableManagerReturn {
  const { getApplicationStatus } = useApplications();
  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState<number>(25);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(config.defaults.filters);
  const [activeSorts, setActiveSorts] = useState<SortSpec[]>(config.defaults.sorts);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"exact" | "fuzzy">("exact");
  const [searchField, setSearchField] = useState<"all" | "company_name" | "title" | "locations">("all");
  const [searchInFiltered, setSearchInFiltered] = useState(true);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const debouncedSetSearchQuery = useCallback((query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(query);
      setPage(1);
    }, 300);
  }, []);

  const filteredData = useMemo(() => {
    if (!initialData || !Array.isArray(initialData)) return [] as Job[];
    if (activeFilters.length === 0) return initialData;
    return applyFilters(initialData, activeFilters, getApplicationStatus);
  }, [initialData, activeFilters, getApplicationStatus]);

  const searchedData = useMemo(() => {
    if (!searchQuery) return searchInFiltered ? filteredData : initialData;
    const dataToSearch = searchInFiltered ? filteredData : initialData;
    const q = searchQuery.toLowerCase();
    const isSubsequence = (needle: string, haystack: string) => {
      let i = 0;
      for (const c of haystack) if (c === needle[i]) i += 1;
      return i === needle.length;
    };
    const match = (text: string) =>
      searchMode === "fuzzy" ? isSubsequence(q, text) : text.includes(q);
    return dataToSearch.filter((item) => {
      const candidateFields =
        searchField === "all"
          ? [item.company_name, item.title, item.locations]
          : [item[searchField]];
      const fields = candidateFields.map((f) => String(f ?? "").toLowerCase());
      return fields.some((t) => match(t));
    });
  }, [searchQuery, searchInFiltered, filteredData, initialData, searchMode, searchField]);

  const sortedData = useMemo(() => applySorts(searchedData, activeSorts), [searchedData, activeSorts]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.min(Math.max(1, newPage), totalPages));
  }, [totalPages]);

  const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage]);
  const prevPage = useCallback(() => goToPage(page - 1), [page, goToPage]);

  const resetFilters = useCallback(() => {
    setActiveFilters(config.defaults.filters);
    setPage(1);
  }, []);

  const resetSorts = useCallback(() => {
    setActiveSorts(config.defaults.sorts);
    setPage(1);
  }, []);

  const clearAll = useCallback(() => {
    setActiveFilters([]);
    setActiveSorts([]);
    setSearchQuery("");
    setPage(1);
  }, []);

  const setPageSizeNumber = (n: number) => _setPageSize(n);

  return {
    paginatedData,
    pageSize,
    setPageSize: setPageSizeNumber,
    page,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    searchQuery,
    setSearchQuery: debouncedSetSearchQuery,
    searchMode,
    setSearchMode,
    searchField,
    setSearchField,
    searchInFiltered,
    setSearchInFiltered,
    activeFilters,
    setActiveFilters,
    activeSorts,
    setActiveSorts,
    resetFilters,
    resetSorts,
    clearAll,
    totalCount: sortedData.length,
    searchedData,
  };
}


