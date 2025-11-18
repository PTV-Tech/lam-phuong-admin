"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { isAuthenticated as checkAuth, getToken } from "@/lib/auth";

const PUBLIC_PAGES = ["/sign-in", "/verify-email"];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: authContextAuth, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const [isChecking, setIsChecking] = useState(!isPublicPage);

  useEffect(() => {
    // Skip check for public pages
    if (isPublicPage) {
      // For sign-in page, if authenticated, redirect to dashboard
      // BUT: Don't redirect if user was redirected here due to unauthorized (401)
      if (pathname === "/sign-in" && !isLoading) {
        const isUnauthorized = searchParams.get("unauthorized") === "true";
        // If user was redirected due to 401, don't redirect them away
        // They need to sign in again
        if (!isUnauthorized) {
          const hasAuth = checkAuth();
          const token = getToken();
          if (hasAuth || token) {
            const redirect = searchParams.get("redirect") || "/";
            router.replace(redirect);
          }
        }
      }
      // Use setTimeout to defer state update for public pages
      const timer = setTimeout(() => {
        setIsChecking(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Check authentication from both localStorage and cookies
    const hasAuth = checkAuth();
    const token = getToken();

    // Protect all other routes
    if (!isLoading) {
      if (!hasAuth && !token) {
        router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      } else {
        // Use setTimeout to defer state update
        const timer = setTimeout(() => {
          setIsChecking(false);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [authContextAuth, isLoading, pathname, router, searchParams, isPublicPage]);

  // Show loading state while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  // Don't render protected content if not authenticated (except public pages)
  if (!isPublicPage && !checkAuth()) {
    return null;
  }

  return <>{children}</>;
}

