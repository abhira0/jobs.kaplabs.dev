"use client";

import { useState } from "react";
import type { ActiveFilter } from "@/utils/filters";
import FilterModal from "./FilterModal";

type Props = {
  activeFilters: ActiveFilter[];
  setActiveFilters: (f: ActiveFilter[]) => void;
};

export default function FilterSection({ activeFilters, setActiveFilters }: Props) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<{ filter: ActiveFilter; index: number } | null>(null);

  const removeFilter = (index: number) => setActiveFilters(activeFilters.filter((_, i) => i !== index));
  const duplicateFilter = (filter: ActiveFilter) => setActiveFilters([...activeFilters, { ...filter }]);
  const getFilterSymbol = (type: string) => ({ contains: "⊇", equals: "=", "not-equals": "≠", "not-contains": "⊉", regex: "~", "not-regex": "≁" }[type] ?? type);

  const getFilterDisplay = (filter: ActiveFilter) => {
    if (filter.column === "date_posted") {
      return (
        <span className="font-mono">
          <span className="text-blue-400">{filter.column}</span>
          <span className="text-gray-400"> ∈ [</span>
          <span className="text-green-400">{filter.fromDate || "-∞"}</span>
          <span className="text-gray-400">, </span>
          <span className="text-green-400">{filter.toDate || "∞"}</span>
          <span className="text-gray-400">]</span>
        </span>
      );
    }
    if (["active", "hidden"].includes(filter.column)) {
      const key = filter.column as "active" | "hidden";
      return (
        <span className="font-mono">
          <span className="text-blue-400">{filter.column}</span>
          <span className="text-gray-400"> = </span>
          <span className="text-green-400">{(filter as Record<string, unknown>)[key] ? "✓" : "✗"}</span>
        </span>
      );
    }
    if ("conditions" in filter) {
      const conditions = filter.conditions.map((c, i) => (
        <span key={i}>
          {i > 0 && <span className="text-yellow-400"> {filter.conditionType === "AND" ? "∧" : "∨"} </span>}
          <span className="text-gray-400">{getFilterSymbol(c.type)}</span>
          <span className="text-green-400"> &quot;{c.value}&quot;</span>
        </span>
      ));
      return (
        <span className="font-mono">
          <span className="text-blue-400">{filter.column}</span> {conditions}
        </span>
      );
    }
    return String(filter.column);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter, index) => (
          <div key={index} className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg text-sm border border-default">
            <span className="text-gray-200">{getFilterDisplay(filter)}</span>
            <div className="flex gap-1">
              <button onClick={() => { setEditingFilter({ filter, index }); setFilterModalOpen(true); }} className="rounded-md border border-default px-2 text-xs hover:bg-white/5">Edit</button>
              <button onClick={() => duplicateFilter(filter)} className="rounded-md border border-default px-2 text-xs hover:bg-white/5">Duplicate</button>
              <button onClick={() => removeFilter(index)} className="rounded-md border border-default px-2 text-xs hover:bg-white/5">Remove</button>
            </div>
          </div>
        ))}
        <button onClick={() => setFilterModalOpen(true)} className="rounded-md border border-dashed border-default px-2 text-xs hover:bg-white/5">+ Add filter</button>
      </div>
      <FilterModal
        isOpen={filterModalOpen}
        onClose={() => { setFilterModalOpen(false); setEditingFilter(null); }}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
        editingFilter={editingFilter}
      />
    </div>
  );
}



