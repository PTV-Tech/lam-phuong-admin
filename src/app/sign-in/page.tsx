"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { ModeToggle } from "@/components/theme/mode-toggle";

interface ValidationErrors {
  email?: string;
  password?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
}

interface FormState {
  email: string;
  password: string;
}

// Constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const REQUIRED_PASSWORD_SCORE = 5;

// Validation functions (moved outside component for better performance)
const validateEmail = (emailValue: string): string | undefined => {
  if (!emailValue.trim()) {
    return "Email là bắt buộc";
  }
  if (!EMAIL_REGEX.test(emailValue)) {
    return "Email không hợp lệ";
  }
  return undefined;
};

const validatePasswordStrength = (passwordValue: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  const checks = [
    {
      test: passwordValue.length >= MIN_PASSWORD_LENGTH,
      message: "Mật khẩu phải có ít nhất 8 ký tự",
    },
    {
      test: /[a-z]/.test(passwordValue),
      message: "Mật khẩu phải có ít nhất một chữ cái thường",
    },
    {
      test: /[A-Z]/.test(passwordValue),
      message: "Mật khẩu phải có ít nhất một chữ cái hoa",
    },
    {
      test: /[0-9]/.test(passwordValue),
      message: "Mật khẩu phải có ít nhất một số",
    },
    {
      test: /[^a-zA-Z0-9]/.test(passwordValue),
      message: "Mật khẩu phải có ít nhất một ký tự đặc biệt",
    },
  ];

  checks.forEach(({ test, message }) => {
    if (test) {
      score += 1;
    } else {
      feedback.push(message);
    }
  });

  return { score, feedback };
};

const validatePassword = (passwordValue: string): string | undefined => {
  if (!passwordValue.trim()) {
    return "Mật khẩu là bắt buộc";
  }
  const strength = validatePasswordStrength(passwordValue);
  if (strength.score < REQUIRED_PASSWORD_SCORE) {
    return strength.feedback[0];
  }
  return undefined;
};

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const strength = useMemo(
    () => validatePasswordStrength(password),
    [password]
  );

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">Độ mạnh mật khẩu:</p>
      <div className="flex gap-1">
        {Array.from({ length: REQUIRED_PASSWORD_SCORE }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded transition-colors ${
              i < strength.score ? "bg-green-500" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default function SignInPage() {
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{
    email: boolean;
    password: boolean;
  }>({
    email: false,
    password: false,
  });

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormState((prev) => ({ ...prev, email: value }));
      if (touched.email) {
        setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
      }
    },
    [touched.email]
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormState((prev) => ({ ...prev, password: value }));
      if (touched.password) {
        setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
      }
    },
    [touched.password]
  );

  const handleEmailBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, email: true }));
    setErrors((prev) => ({
      ...prev,
      email: validateEmail(formState.email),
    }));
  }, [formState.email]);

  const handlePasswordBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, password: true }));
    setErrors((prev) => ({
      ...prev,
      password: validatePassword(formState.password),
    }));
  }, [formState.password]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      setTouched({ email: true, password: true });

      const emailError = validateEmail(formState.email);
      const passwordError = validatePassword(formState.password);

      if (emailError || passwordError) {
        setErrors({
          email: emailError,
          password: passwordError,
        });
        return;
      }

      setIsLoading(true);

      const payload = {
        email: formState.email,
        password: formState.password,
      };

      console.log("Sign in payload:", payload);

      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    },
    [formState.email, formState.password]
  );

  const isFormValid = useMemo(
    () =>
      !errors.email &&
      !errors.password &&
      formState.email.trim() &&
      formState.password.trim(),
    [errors.email, errors.password, formState.email, formState.password]
  );

  const showPasswordStrength =
    formState.password && touched.password && !errors.password;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="rounded-full bg-primary p-3">
              <LogIn className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Đăng nhập</CardTitle>
          <CardDescription className="text-center">
            Nhập thông tin đăng nhập để tiếp tục
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formState.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                disabled={isLoading}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formState.password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                disabled={isLoading}
                aria-invalid={!!errors.password}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password}
                </p>
              )}
              {showPasswordStrength && (
                <PasswordStrengthIndicator password={formState.password} />
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
