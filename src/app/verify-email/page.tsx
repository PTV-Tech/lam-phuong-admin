import { Suspense } from "react";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Đang tải...</div>
        </div>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}

