/**
 * Search and filter bar component for Locations page
 */

import { SingleSelect } from '@/components/SingleSelect'

interface LocationsSearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onClearSearch: () => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  totalCount: number
  filteredCount: number
  hasActiveFilters: boolean
}

export function LocationsSearchBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  filteredCount,
  hasActiveFilters,
}: LocationsSearchBarProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="relative flex-1 sm:flex-initial sm:w-64">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </button>
          )}
        </div>
        <div className="w-full sm:w-auto sm:min-w-[180px]">
          <SingleSelect
            options={[
              { id: 'all', label: 'All Status' },
              { id: 'Active', label: 'Active' },
              { id: 'Disabled', label: 'Disabled' },
            ]}
            value={statusFilter}
            onChange={(value) => onStatusFilterChange(value || 'all')}
            placeholder="Filter by status..."
            className="w-full"
          />
        </div>
      </div>
      {/* Result Count */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} location{totalCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

