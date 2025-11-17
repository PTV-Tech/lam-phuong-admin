import { getToken } from "./auth";
import type {
  Location,
  CreateLocationRequest,
  CreateLocationResponse,
  LocationsResponse,
  DeleteLocationResponse,
  LocationError,
} from "@/types/location";

const API_BASE_URL = process.env.NEXT_PUBLIC_LP_API_URL;

export async function getLocations(token?: string): Promise<Location[]> {
  if (!API_BASE_URL) {
    // Return empty array if API is not configured (for development)
    return [];
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const authToken = token || (typeof window !== "undefined" ? getToken() : null);
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/locations`, {
      headers,
      cache: "no-store",
    });

    // Handle 404 as empty array (no locations exist yet)
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      // Try to parse error response
      try {
        const errorData = (await response.json()) as LocationError;
        if ("error" in errorData && errorData.error?.message) {
          throw new Error(errorData.error.message);
        }
      } catch {
        // If error parsing fails, use status code
      }
      throw new Error(`Failed to fetch locations: ${response.status}`);
    }

    const data = (await response.json()) as LocationsResponse | LocationError;

    if ("success" in data && data.success && "data" in data) {
      return data.data;
    }

    // If response format is unexpected but status is OK, return empty array
    return [];
  } catch (error) {
    // If it's a known error, rethrow it
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    // For other errors (network, etc.), return empty array to prevent page crash
    console.error("Error fetching locations:", error);
    return [];
  }
}

export async function createLocation(
  location: CreateLocationRequest,
  token?: string
): Promise<Location> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const authToken = token || (typeof window !== "undefined" ? getToken() : null);
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/locations`, {
    method: "POST",
    headers,
    body: JSON.stringify(location),
  });

  const data = (await response.json()) as CreateLocationResponse | LocationError;

  if (!response.ok) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to create location");
    }
    throw new Error("Failed to create location");
  }

  if ("success" in data && data.success && "data" in data) {
    return data.data;
  }

  throw new Error("Invalid response format");
}

export async function deleteLocation(
  slug: string,
  token?: string
): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const authToken = token || (typeof window !== "undefined" ? getToken() : null);
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/locations/${slug}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const errorData = (await response.json()) as LocationError;
    if ("error" in errorData) {
      throw new Error(errorData.error.message || "Failed to delete location");
    }
    throw new Error(`Failed to delete location: ${response.status}`);
  }

  const data = (await response.json()) as DeleteLocationResponse | LocationError;

  if ("success" in data && !data.success) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to delete location");
    }
    throw new Error("Failed to delete location");
  }
}

