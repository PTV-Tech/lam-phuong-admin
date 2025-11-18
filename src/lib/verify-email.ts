const API_BASE_URL = process.env.NEXT_PUBLIC_LP_API_URL;

export interface VerifyEmailResponse {
  data: string;
  message: string;
  success: true;
}

export interface VerifyEmailError {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
  };
  message: string;
  success: false;
}

export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  if (!token) {
    throw new Error("Verification token is required");
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = (await response.json()) as VerifyEmailResponse | VerifyEmailError;

  if (!response.ok) {
    if ("error" in data) {
      throw new Error(data.error.message || "Failed to verify email");
    }
    throw new Error("Failed to verify email");
  }

  if ("success" in data && data.success) {
    return data;
  }

  throw new Error("Invalid response format");
}

