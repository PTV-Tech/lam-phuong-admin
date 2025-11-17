"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { isAuthenticated as checkAuth, getToken } from "@/lib/auth";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: authContextAuth, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check authentication from both localStorage and cookies
    const hasAuth = checkAuth();
    const token = getToken();
    
    // Skip check for sign-in page
    if (pathname === "/sign-in") {
      // If authenticated (via localStorage or cookie), redirect to dashboard
      if (!isLoading && (hasAuth || token)) {
        const redirect = searchParams.get("redirect") || "/";
        router.replace(redirect);
      }
      setIsChecking(false);
      return;
    }

    // Protect all other routes
    if (!isLoading && !hasAuth && !token) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      setIsChecking(false);
      return;
    }

    setIsChecking(false);
  }, [authContextAuth, isLoading, pathname, router, searchParams]);

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (pathname !== "/sign-in" && !checkAuth()) {
    return null;
  }

  return <>{children}</>;
}

