import { fetchApi } from "./api";
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

  try {
    const response = await fetchApi(
      `${API_BASE_URL}/locations`,
      {
        cache: "no-store",
      },
      token
    );

    // Handle 404 as empty array (no locations exist yet)
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
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
    // If it's an Unauthorized error, it's already handled by fetchApi (redirects to sign-in)
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

  const response = await fetchApi(
    `${API_BASE_URL}/locations`,
    {
      method: "POST",
      body: JSON.stringify(location),
    },
    token
  );

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

  const response = await fetchApi(
    `${API_BASE_URL}/locations/${slug}`,
    {
      method: "DELETE",
    },
    token
  );

  if (!response.ok) {
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

