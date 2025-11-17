"use client";

import { useEffect, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  mode?: "exact" | "fuzzy";
  setMode?: (m: "exact" | "fuzzy") => void;
  field?: "all" | "company_name" | "title" | "locations";
  setField?: (f: "all" | "company_name" | "title" | "locations") => void;
  searchInFiltered: boolean;
  setSearchInFiltered: (v: boolean) => void;
};

export default function SearchBar({ value, onChange, mode = "exact", setMode, field = "all", setField, searchInFiltered, setSearchInFiltered }: Props) {
  const [inputValue, setInputValue] = useState(value ?? "");

  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  const handleSearch = () => onChange(inputValue);
  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search jobs..."
            className="focus-ring w-full rounded-md border border-default bg-transparent px-3 py-2 text-sm placeholder:text-muted"
          />
        </div>
        <button onClick={handleSearch} className="focus-ring rounded-md border border-default px-3 py-2 text-sm hover:bg-white/5">
          Search
        </button>
        <button
          onClick={() => {
            setInputValue("");
            onChange("");
          }}
          className="focus-ring rounded-md border border-default px-3 py-2 text-sm hover:bg-white/5"
        >
          Clear
        </button>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={searchInFiltered}
            onChange={(e) => setSearchInFiltered(e.target.checked)}
          />
          <span className="text-muted">Search in filtered results only</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-muted">Search</span>
          <select
            value={field}
            onChange={(e) => setField?.(e.target.value as "all" | "company_name" | "title" | "locations")}
            className="rounded-md border border-default bg-gray-900 text-gray-100 px-2 py-1 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-white/10"
            style={{ colorScheme: "dark" }}
          >
            <option value="all">All fields</option>
            <option value="company_name">Company</option>
            <option value="title">Role</option>
            <option value="locations">Location</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-muted">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode?.(e.target.value as "fuzzy" | "exact")}
            className="rounded-md border border-default bg-gray-900 text-gray-100 px-2 py-1 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-white/10"
            style={{ colorScheme: "dark" }}
          >
            <option value="exact">Exact</option>
            <option value="fuzzy">Fuzzy</option>
          </select>
        </label>
      </div>
    </div>
  );
}



