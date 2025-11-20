/**
 * Hook for fetching and managing locations list
 */

import { useMemo } from "react";
import { useLocations } from "@/hooks/useLocations";

export function useLocationsList() {
  const {
    locations,
    isLoading,
    error: locationsError,
    invalidateCache,
  } = useLocations();

  // Convert error to string format
  const error = useMemo(() => {
    if (!locationsError) return null;
    return locationsError instanceof Error
      ? locationsError.message
      : "Failed to load locations";
  }, [locationsError]);

  return {
    locations,
    isLoading,
    error,
    invalidateCache,
  };
}
