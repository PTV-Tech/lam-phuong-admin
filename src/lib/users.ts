import { getToken } from "./auth";
import type { User } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_LP_API_URL;

export interface UsersResponse {
  data: User[];
  message: string;
  success: true;
}

export interface UsersError {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
  };
  message: string;
  success: false;
}

export async function getUsers(token?: string): Promise<User[]> {
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
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers,
      cache: "no-store",
    });

    // Handle 404 as empty array (no users exist yet)
    if (response.status === 404) {
      return [];
    }

    // Handle 403 (Forbidden) - user doesn't have permission, return empty array
    if (response.status === 403) {
      console.warn("Access forbidden: User does not have permission to view users");
      return [];
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized");
      }
      // Try to parse error response
      try {
        const errorData = (await response.json()) as UsersError;
        if ("error" in errorData && errorData.error?.message) {
          throw new Error(errorData.error.message);
        }
      } catch {
        // If error parsing fails, use status code
      }
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const data = (await response.json()) as UsersResponse | UsersError;

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
    console.error("Error fetching users:", error);
    return [];
  }
}

