import { fetchApi } from "./api";
import type {
  JobCategory,
  CreateJobCategoryRequest,
  CreateJobCategoryResponse,
  JobCategoriesResponse,
  DeleteJobCategoryResponse,
  JobCategoryError,
} from "@/types/job-category";

const API_BASE_URL = process.env.NEXT_PUBLIC_LP_API_URL;

export async function getJobCategories(token?: string): Promise<JobCategory[]> {
  if (!API_BASE_URL) {
    // Return empty array if API is not configured (for development)
    return [];
  }

  try {
    const response = await fetchApi(
      `${API_BASE_URL}/job-categories`,
      {
        cache: "no-store",
      },
      token
    );

    // Handle 404 as empty array (no job categories exist yet)
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = (await response.json()) as JobCategoryError;
        if ("error" in errorData && errorData.error?.message) {
          throw new Error(errorData.error.message);
        }
      } catch {
        // If error parsing fails, use status code
      }
      throw new Error(`Failed to fetch job categories: ${response.status}`);
    }

    const data = (await response.json()) as JobCategoriesResponse | JobCategoryError;

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
    console.error("Error fetching job categories:", error);
    return [];
  }
}

export async function createJobCategory(
  jobCategory: CreateJobCategoryRequest,
  token?: string
): Promise<JobCategory> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetchApi(
    `${API_BASE_URL}/job-categories`,
    {
      method: "POST",
      body: JSON.stringify(jobCategory),
    },
    token
  );

  const data = (await response.json()) as CreateJobCategoryResponse | JobCategoryError;

  if (!response.ok) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to create job category");
    }
    throw new Error("Failed to create job category");
  }

  if ("success" in data && data.success && "data" in data) {
    return data.data;
  }

  throw new Error("Invalid response format");
}

export async function deleteJobCategory(
  slug: string,
  token?: string
): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetchApi(
    `${API_BASE_URL}/job-categories/${slug}`,
    {
      method: "DELETE",
    },
    token
  );

  if (!response.ok) {
    const errorData = (await response.json()) as JobCategoryError;
    if ("error" in errorData) {
      throw new Error(errorData.error.message || "Failed to delete job category");
    }
    throw new Error(`Failed to delete job category: ${response.status}`);
  }

  const data = (await response.json()) as DeleteJobCategoryResponse | JobCategoryError;

  if ("success" in data && !data.success) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to delete job category");
    }
    throw new Error("Failed to delete job category");
  }
}

