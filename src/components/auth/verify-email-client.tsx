"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/verify-email";

export function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">(() => {
    return token ? "loading" : "error";
  });
  const [errorMessage, setErrorMessage] = useState<string>(() => {
    return token ? "" : "Token xác thực không hợp lệ hoặc không tồn tại";
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    const handleVerify = async () => {
      try {
        await verifyEmail(token);
        if (isMounted) {
          setStatus("success");
          // Navigate to login page after 2 seconds
          setTimeout(() => {
            router.replace("/sign-in");
          }, 2000);
        }
      } catch (error) {
        if (isMounted) {
          setStatus("error");
          setErrorMessage(
            error instanceof Error ? error.message : "Không thể xác thực email"
          );
        }
      }
    };

    handleVerify();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <CardTitle className="text-2xl">Đang xác thực email</CardTitle>
              <CardDescription>
                Vui lòng đợi trong giây lát...
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-900 dark:text-green-100">
                Xác thực thành công
              </CardTitle>
              <CardDescription>
                Email của bạn đã được xác thực thành công. Đang chuyển hướng đến trang đăng nhập...
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">
                Xác thực thất bại
              </CardTitle>
              <CardDescription>
                {errorMessage || "Không thể xác thực email. Vui lòng thử lại sau."}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "error" && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium mb-1">Lỗi:</p>
              <p>{errorMessage}</p>
            </div>
          )}

          {status === "error" && (
            <Button
              onClick={() => router.push("/sign-in")}
              className="w-full"
              variant="outline"
            >
              Quay lại trang đăng nhập
            </Button>
          )}

          {status === "success" && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm text-green-900 dark:text-green-100">
                Bạn có thể đăng nhập ngay bây giờ!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

