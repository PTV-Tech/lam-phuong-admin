import type { SignInRequest, SignInResponse, SignInError } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_LP_API_URL;
const TOKEN_KEY = "lp_auth_token";
const USER_KEY = "lp_auth_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function getUserFromCookie(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  try {
    // Cookie format: lp_auth_user=JSON_STRING
    // We need to get it from document.cookie or parse it
    // For server-side, we'll need to decode it properly
    return JSON.parse(decodeURIComponent(cookieValue));
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  
  // Also set cookies for middleware and server-side access
  const userJson = JSON.stringify(user);
  document.cookie = `lp_auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
  document.cookie = `lp_auth_user=${encodeURIComponent(userJson)}; path=/; max-age=86400; SameSite=Lax`;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Also clear cookies
  document.cookie = `lp_auth_token=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `lp_auth_user=; path=/; max-age=0; SameSite=Lax`;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function signIn(
  credentials: SignInRequest
): Promise<SignInResponse> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = (await response.json()) as SignInResponse | SignInError;

  if (!response.ok) {
    if ("error" in data) {
      throw new Error(data.error.message || "Đăng nhập thất bại");
    }
    throw new Error("Đăng nhập thất bại");
  }

  if ("success" in data && data.success && "data" in data) {
    // Store token and user
    setAuth(data.data.access_token, data.data.user);
    return data;
  }

  throw new Error("Phản hồi không hợp lệ từ server");
}

export async function signOut() {
  clearAuth();
}

