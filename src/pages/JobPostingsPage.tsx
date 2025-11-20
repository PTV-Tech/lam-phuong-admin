import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MultiSelect } from "@/components/MultiSelect";
import { useLazyData } from "@/hooks/useLazyData";
import {
  getJobPostings,
  deleteJobPosting,
  type JobPostingFields,
  type AirtableRecord,
} from "@/lib/airtable-api";

interface JobPostingRecord extends AirtableRecord<JobPostingFields> {
  fields: JobPostingFields & {
    "Tên khu vực"?: string[];
    "Tên danh mục công việc"?: string[];
    "Tên loại công việc"?: string[];
    "Tên nhóm sản phẩm"?: string[];
  };
}

// Helper function to determine status badge
function getStatusBadge(
  status: string | undefined,
  deadline: string | undefined
): { label: string; color: string; bgColor: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deadline) {
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    if (deadlineDate < today) {
      return {
        label: "Expired",
        color: "text-red-700",
        bgColor: "bg-red-100",
      };
    }
  }

  if (status === "Approved") {
    return {
      label: "Active",
      color: "text-green-700",
      bgColor: "bg-green-100",
    };
  }

  return {
    label: "Draft",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  };
}

// Helper function to format date
function formatDate(dateString: string | undefined): string {
  if (!dateString) return "No deadline";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Helper function to get relative date
function getRelativeDate(dateString: string | undefined): string | null {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(dateString);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return null; // Already passed
  if (diffDays === 0) return "Expires today";
  if (diffDays === 1) return "Expires tomorrow";
  if (diffDays <= 7) return `Expires in ${diffDays} days`;
  return null;
}

// Helper function to check if deadline is within 7 days
function isDeadlineNear(dateString: string | undefined): boolean {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(dateString);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

// Helper function to check if deadline has passed
function isDeadlinePassed(dateString: string | undefined): boolean {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(dateString);
  deadlineDate.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

export function JobPostingsPage() {
  const navigate = useNavigate();
  const [jobPostings, setJobPostings] = useState<JobPostingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    ids: string[];
    title?: string;
  }>({ open: false, ids: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationFetchError, setLocationFetchError] = useState<string | null>(null);

  // Lazy loading hook for locations
  const { dataCache, loading: lazyLoading, fetchLocations } = useLazyData();

  // Ref to prevent duplicate calls during StrictMode double render
  const fetchingRef = useRef(false);

  // Handle location fetch with error handling
  const handleFetchLocations = useCallback(async () => {
    try {
      setLocationFetchError(null);
      await fetchLocations();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load locations";
      setLocationFetchError(errorMessage);
      console.error("Error fetching locations:", err);
      throw err; // Re-throw so MultiSelect can handle it
    }
  }, [fetchLocations]);

  // Get locations options from API data
  const locationOptions = useMemo(() => {
    const locations = dataCache.locations || [];
    return locations
      .filter((loc) => loc.fields.Name && loc.fields.Name.trim())
      .map((loc) => ({
        id: loc.fields.Name || "",
        label: loc.fields.Name || "",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [dataCache.locations]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Optimized filtering with useMemo (search AND location filter)
  const filteredJobPostings = useMemo(() => {
    return jobPostings.filter((posting) => {
      // Search filter (by title)
      const title = posting.fields["Tiêu đề"] || "";
      const matchesSearch =
        debouncedSearchQuery === "" ||
        title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      // Location filter (by location names in "Tên khu vực" array)
      const matchesLocation =
        selectedLocations.length === 0 ||
        (() => {
          const postingLocations = posting.fields["Tên khu vực"] || [];
          if (postingLocations.length === 0) return false;

          // Check if any posting location matches any selected location
          return postingLocations.some((postingLoc) =>
            selectedLocations.includes(postingLoc)
          );
        })();

      return matchesSearch && matchesLocation;
    });
  }, [jobPostings, debouncedSearchQuery, selectedLocations]);

  // Clear search function
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  }, []);

  // Clear location filter
  const handleClearLocations = useCallback(() => {
    setSelectedLocations([]);
  }, []);

  const loadJobPostings = useCallback(async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      console.log("[JobPostingsPage] Already fetching, skipping duplicate call");
      return;
    }

    console.log("[JobPostingsPage] Fetching job postings...");
    fetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      const fieldsToFetch = [
        "Tiêu đề",
        "Slug",
        "Giới thiệu",
        "Hạn chót nhận",
        "Tên khu vực",
        "Tên danh mục công việc",
        "Tên loại công việc",
        "Tên nhóm sản phẩm",
        "Status",
        "Khu vực",
        "Danh mục công việc",
        "Loại công việc",
        "Nhóm sản phẩm",
      ];

      const response = await getJobPostings({
        fields: fieldsToFetch,
      });

      console.log("[JobPostingsPage] Job postings fetched successfully:", response.records.length);
      setJobPostings(response.records as JobPostingRecord[]);
    } catch (err) {
      console.error("[JobPostingsPage] Error loading job postings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load job postings"
      );
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadJobPostings();
  }, [loadJobPostings]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredJobPostings.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleDeleteClick = (ids: string[], title?: string) => {
    setDeleteConfirm({ open: true, ids, title });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.ids.length === 0) return;

    try {
      setDeleting(true);
      if (deleteConfirm.ids.length === 1) {
        await deleteJobPosting(deleteConfirm.ids[0]);
      } else {
        await Promise.all(
          deleteConfirm.ids.map((id) => deleteJobPosting(id))
        );
      }

      setJobPostings((prev) =>
        prev.filter((p) => !deleteConfirm.ids.includes(p.id))
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteConfirm.ids.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteConfirm({ open: false, ids: [] });
    } catch (err) {
      console.error("Error deleting job posting:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete job posting(s)"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, ids: [] });
  };

  const allSelected =
    filteredJobPostings.length > 0 &&
    filteredJobPostings.every((p) => selectedIds.has(p.id));
  const someSelected =
    selectedIds.size > 0 &&
    filteredJobPostings.some((p) => selectedIds.has(p.id)) &&
    !allSelected;

  return (
    <AppLayout>
      <div className="min-h-full bg-[#f9fafb]">
        {/* Header */}
        <div className="border-b border-border bg-white backdrop-blur supports-[backdrop-filter]:bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  Job Postings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your job postings database
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <Button
                    onClick={() =>
                      handleDeleteClick(Array.from(selectedIds))
                    }
                    variant="destructive"
                    size="lg"
                    className="shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Delete ({selectedIds.size})
                  </Button>
                )}
                <Button
                  onClick={() => navigate("/job-postings/new")}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  Create Job Posting
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading ? (
            // Loading State with Skeletons
            <div className="grid gap-6 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Card
                  key={i}
                  className="rounded-xl border border-[#e5e7eb] shadow-sm animate-pulse"
                >
                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-md bg-gray-200 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
                          <div className="flex-1 min-w-0 pr-8">
                            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-6 pb-6">
                    <div className="pt-4 border-t border-border space-y-3">
                      <div className="h-6 bg-gray-200 rounded w-20" />
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="flex flex-wrap gap-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16" />
                        <div className="h-6 bg-gray-200 rounded-full w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            // Error State
            <Card className="max-w-md mx-auto border-destructive/20">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-destructive"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <CardTitle className="text-destructive">
                  Error Loading Job Postings
                </CardTitle>
                <CardDescription className="mt-2">{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={loadJobPostings} className="w-full" size="lg">
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
                    className="mr-2"
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : jobPostings.length === 0 ? (
            // Empty State (no job postings at all)
            <Card className="max-w-md mx-auto border-dashed">
              <CardHeader className="text-center py-12">
                <div className="mx-auto mb-4 p-4 rounded-full bg-muted w-fit">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    <rect width="20" height="14" x="2" y="6" rx="2" />
                  </svg>
                </div>
                <CardTitle>No job postings yet</CardTitle>
                <CardDescription className="mt-2">
                  Create your first job posting to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate("/job-postings/new")}
                  className="w-full"
                  size="lg"
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
                    className="mr-2"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  Create Job Posting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search and Filter Bar */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:max-w-md">
                    <label htmlFor="search-job-postings" className="sr-only">
                      Search job postings
                    </label>
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
                      id="search-job-postings"
                      type="text"
                      placeholder="Search job postings... / Tìm kiếm bài tuyển dụng..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm h-10"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
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

                  {/* Location Filter */}
                  <div className="flex-1 sm:max-w-xs">
                    <label htmlFor="location-filter" className="sr-only">
                      Filter by location
                    </label>
                    <MultiSelect
                      options={locationOptions}
                      value={selectedLocations}
                      onChange={setSelectedLocations}
                      placeholder="All Locations / Tất cả khu vực"
                      className="w-full"
                      loading={lazyLoading.locations}
                      onOpen={handleFetchLocations}
                    />
                    {locationFetchError && (
                      <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                        <div className="flex items-start gap-2">
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
                            className="text-destructive flex-shrink-0 mt-0.5"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-sm text-destructive font-medium">
                              {locationFetchError.includes("RATE_LIMIT")
                                ? "Too many requests. Please wait a moment and try again."
                                : "Failed to load locations"}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setLocationFetchError(null);
                                handleFetchLocations();
                              }}
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Location Tags */}
                {selectedLocations.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filtered by:</span>
                    {selectedLocations.map((location) => (
                      <span
                        key={location}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {location}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLocations((prev) =>
                              prev.filter((loc) => loc !== location)
                            )
                          }
                          className="ml-1 hover:text-blue-900 transition-colors"
                          aria-label={`Remove ${location} filter`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
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
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearLocations}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Result Count */}
              {(debouncedSearchQuery || selectedLocations.length > 0) && (
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {filteredJobPostings.length} of {jobPostings.length}{" "}
                  job posting{jobPostings.length !== 1 ? "s" : ""}
                </div>
              )}

              {/* Empty State for Search/Filter Results */}
              {filteredJobPostings.length === 0 ? (
                <Card className="max-w-md mx-auto border-dashed">
                  <CardHeader className="text-center py-12">
                    <div className="mx-auto mb-4 p-4 rounded-full bg-muted w-fit">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                        <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
                      </svg>
                    </div>
                    <CardTitle>No job postings found</CardTitle>
                    <CardDescription className="mt-2">
                      {debouncedSearchQuery && selectedLocations.length > 0
                        ? `No job postings match "${debouncedSearchQuery}" in selected locations`
                        : debouncedSearchQuery
                        ? `No job postings match "${debouncedSearchQuery}"`
                        : selectedLocations.length > 0
                        ? "No job postings found in selected locations"
                        : "Try adjusting your search or filters"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(debouncedSearchQuery || selectedLocations.length > 0) && (
                      <Button
                        onClick={() => {
                          handleClearSearch();
                          handleClearLocations();
                        }}
                        className="w-full"
                        size="lg"
                        variant="outline"
                      >
                        Clear all filters
                      </Button>
                    )}
                    {debouncedSearchQuery && (
                      <Button
                        onClick={handleClearSearch}
                        className="w-full"
                        size="lg"
                        variant="outline"
                      >
                        Clear search
                      </Button>
                    )}
                    {selectedLocations.length > 0 && (
                      <Button
                        onClick={handleClearLocations}
                        className="w-full"
                        size="lg"
                        variant="outline"
                      >
                        Clear location filter
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Select All Section */}
                  {filteredJobPostings.length > 0 && (
                    <div className="mb-6 bg-[#f9fafb] rounded-lg px-4 py-3 border border-[#e5e7eb]">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-5 h-5 rounded-md flex-shrink-0 transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {selectedIds.size > 0
                            ? `${filteredJobPostings.filter((p) => selectedIds.has(p.id)).length} of ${filteredJobPostings.length} job posting${filteredJobPostings.length !== 1 ? "s" : ""} selected`
                            : "Select all"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Job Postings Grid */}
                  <div className="grid gap-6 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredJobPostings.map((posting) => {
                  const statusBadge = getStatusBadge(
                    posting.fields.Status,
                    posting.fields["Hạn chót nhận"]
                  );
                  const relativeDate = getRelativeDate(
                    posting.fields["Hạn chót nhận"]
                  );
                  const deadlineNear = isDeadlineNear(
                    posting.fields["Hạn chót nhận"]
                  );
                  const deadlinePassed = isDeadlinePassed(
                    posting.fields["Hạn chót nhận"]
                  );

                  // Get tags with priority
                  const locations =
                    posting.fields["Tên khu vực"] || [];
                  const categories =
                    posting.fields["Tên danh mục công việc"] || [];
                  const jobTypes =
                    posting.fields["Tên loại công việc"] || [];
                  const productGroups =
                    posting.fields["Tên nhóm sản phẩm"] || [];

                  return (
                    <Card
                      key={posting.id}
                      className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ease-out cursor-pointer ${
                        selectedIds.has(posting.id)
                          ? "border-primary border-2 shadow-lg translate-y-0"
                          : "border-[#e5e7eb] shadow-sm hover:border-[#d1d5db] hover:-translate-y-1 hover:shadow-lg"
                      }`}
                      onClick={() =>
                        navigate(`/job-postings/${posting.id}/edit`)
                      }
                    >
                      {/* Delete Button - Top Right */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick([posting.id], posting.fields["Tiêu đề"]);
                        }}
                        className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 text-[#ef4444] hover:text-[#dc2626] hover:bg-red-50 flex-shrink-0 transition-all duration-200 rounded-lg z-10"
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
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </Button>

                      <CardHeader className="pb-4 pt-6 px-6">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(posting.id)}
                            onChange={() => handleToggleSelect(posting.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded-md flex-shrink-0 mt-1 transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="p-2.5 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-all duration-200 flex-shrink-0 shadow-sm">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="20"
                                  height="20"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-blue-600"
                                >
                                  <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                  <rect width="20" height="14" x="2" y="6" rx="2" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0 pr-8">
                                <CardTitle className="text-lg font-semibold break-words leading-tight text-foreground">
                                  {posting.fields["Tiêu đề"] || "Untitled Job Posting"}
                                </CardTitle>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0 px-6 pb-6">
                        {/* Status and Deadline Section */}
                        <div className="pt-4 border-t border-border space-y-3">
                          {/* Status Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge.bgColor} ${statusBadge.color}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          {/* Deadline */}
                          <div className="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={
                                deadlinePassed
                                  ? "text-red-600"
                                  : deadlineNear
                                  ? "text-orange-600"
                                  : "text-muted-foreground"
                              }
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span
                              className={`text-sm ${
                                deadlinePassed
                                  ? "text-red-600 font-medium"
                                  : deadlineNear
                                  ? "text-orange-600 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {relativeDate || `Deadline: ${formatDate(posting.fields["Hạn chót nhận"])}`}
                            </span>
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {/* Locations Tags */}
                          {locations.slice(0, 2).map((location, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              {location}
                            </span>
                          ))}
                          {locations.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              +{locations.length - 2} more
                            </span>
                          )}

                          {/* Categories Tags */}
                          {categories.slice(0, 2).map((category, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                            >
                              {category}
                            </span>
                          ))}
                          {categories.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              +{categories.length - 2} more
                            </span>
                          )}

                          {/* Job Types Tags */}
                          {jobTypes.slice(0, 2).map((type, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
                            >
                              {type}
                            </span>
                          ))}
                          {jobTypes.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              +{jobTypes.length - 2} more
                            </span>
                          )}

                          {/* Product Groups Tags */}
                          {productGroups.slice(0, 1).map((group, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                            >
                              {group}
                            </span>
                          ))}
                          {productGroups.length > 1 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              +{productGroups.length - 1} more
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">
                Delete Job Posting{deleteConfirm.ids.length > 1 ? "s" : ""}?
              </CardTitle>
              <CardDescription>
                {deleteConfirm.ids.length === 1
                  ? `Are you sure you want to delete "${deleteConfirm.title || "this job posting"}"? This action cannot be undone.`
                  : `Are you sure you want to delete ${deleteConfirm.ids.length} job postings? This action cannot be undone.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
