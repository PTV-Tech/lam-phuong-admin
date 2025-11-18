import { fetchApi } from "./api";
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

export interface CreateUserRequest {
  email: string;
  role: string;
  password: string;
}

export interface CreateUserResponse {
  data: User;
  message: string;
  success: true;
}

export async function getUsers(token?: string): Promise<User[]> {
  if (!API_BASE_URL) {
    // Return empty array if API is not configured (for development)
    return [];
  }

  try {
    const response = await fetchApi(
      `${API_BASE_URL}/users`,
      {
        cache: "no-store",
      },
      token
    );

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
    // If it's an Unauthorized error, it's already handled by fetchApi (redirects to sign-in)
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    // For other errors (network, etc.), return empty array to prevent page crash
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function createUser(
  user: CreateUserRequest,
  token?: string
): Promise<User> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetchApi(
    `${API_BASE_URL}/users`,
    {
      method: "POST",
      body: JSON.stringify(user),
    },
    token
  );

  const data = (await response.json()) as CreateUserResponse | UsersError;

  if (!response.ok) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to create user");
    }
    throw new Error("Failed to create user");
  }

  if ("success" in data && data.success && "data" in data) {
    return data.data;
  }

  throw new Error("Invalid response format");
}

