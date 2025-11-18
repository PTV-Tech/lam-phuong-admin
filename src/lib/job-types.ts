import { fetchApi } from "./api";
import type {
  JobType,
  CreateJobTypeRequest,
  CreateJobTypeResponse,
  JobTypesResponse,
  DeleteJobTypeResponse,
  JobTypeError,
} from "@/types/job-type";

const API_BASE_URL = process.env.NEXT_PUBLIC_LP_API_URL;

export async function getJobTypes(token?: string): Promise<JobType[]> {
  if (!API_BASE_URL) {
    // Return empty array if API is not configured (for development)
    return [];
  }

  try {
    const response = await fetchApi(
      `${API_BASE_URL}/job-types`,
      {
        cache: "no-store",
      },
      token
    );

    // Handle 404 as empty array (no job types exist yet)
    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = (await response.json()) as JobTypeError;
        if ("error" in errorData && errorData.error?.message) {
          throw new Error(errorData.error.message);
        }
      } catch {
        // If error parsing fails, use status code
      }
      throw new Error(`Failed to fetch job types: ${response.status}`);
    }

    const data = (await response.json()) as JobTypesResponse | JobTypeError;

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
    console.error("Error fetching job types:", error);
    return [];
  }
}

export async function createJobType(
  jobType: CreateJobTypeRequest,
  token?: string
): Promise<JobType> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetchApi(
    `${API_BASE_URL}/job-types`,
    {
      method: "POST",
      body: JSON.stringify(jobType),
    },
    token
  );

  const data = (await response.json()) as CreateJobTypeResponse | JobTypeError;

  if (!response.ok) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to create job type");
    }
    throw new Error("Failed to create job type");
  }

  if ("success" in data && data.success && "data" in data) {
    return data.data;
  }

  throw new Error("Invalid response format");
}

export async function deleteJobType(
  slug: string,
  token?: string
): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetchApi(
    `${API_BASE_URL}/job-types/${slug}`,
    {
      method: "DELETE",
    },
    token
  );

  if (!response.ok) {
    const errorData = (await response.json()) as JobTypeError;
    if ("error" in errorData) {
      throw new Error(errorData.error.message || "Failed to delete job type");
    }
    throw new Error(`Failed to delete job type: ${response.status}`);
  }

  const data = (await response.json()) as DeleteJobTypeResponse | JobTypeError;

  if ("success" in data && !data.success) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to delete job type");
    }
    throw new Error("Failed to delete job type");
  }
}

