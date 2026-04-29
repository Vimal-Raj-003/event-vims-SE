import { create } from "zustand";

interface FilterState {
  searchQuery: string;
  activeFilters: string[];
  sortBy: "name" | "company" | "recent";
  viewMode: "grid" | "list";

  setSearchQuery: (query: string) => void;
  toggleFilter: (filter: string) => void;
  setActiveFilters: (filters: string[]) => void;
  clearFilters: () => void;
  setSortBy: (sort: FilterState["sortBy"]) => void;
  setViewMode: (mode: FilterState["viewMode"]) => void;
}

export const useFilterStore = create<FilterState>()((set) => ({
  searchQuery: "",
  activeFilters: [],
  sortBy: "name",
  viewMode: "grid",

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleFilter: (filter) =>
    set((state) => {
      const isActive = state.activeFilters.includes(filter);
      return {
        activeFilters: isActive
          ? state.activeFilters.filter((f) => f !== filter)
          : [...state.activeFilters, filter],
      };
    }),

  setActiveFilters: (activeFilters) => set({ activeFilters }),

  clearFilters: () =>
    set({
      searchQuery: "",
      activeFilters: [],
      sortBy: "name",
    }),

  setSortBy: (sortBy) => set({ sortBy }),

  setViewMode: (viewMode) => set({ viewMode }),
}));
