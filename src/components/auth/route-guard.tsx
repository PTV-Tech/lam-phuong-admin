"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { isAuthenticated as checkAuth } from "@/lib/auth";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: authContextAuth, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Double-check authentication status from localStorage
    const hasAuth = checkAuth();
    
    // Skip check for sign-in page
    if (pathname === "/sign-in") {
      // If authenticated, redirect to dashboard
      if (!isLoading && hasAuth) {
        router.replace("/");
      }
      setIsChecking(false);
      return;
    }

    // Protect all other routes
    if (!isLoading && !hasAuth) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      setIsChecking(false);
      return;
    }

    setIsChecking(false);
  }, [authContextAuth, isLoading, pathname, router]);

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

