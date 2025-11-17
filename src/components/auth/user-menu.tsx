"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/types/auth";

interface UserMenuProps {
  user: UserType | null;
}

export function UserMenu({ user }: UserMenuProps) {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // signOut already handles redirect, no need for refresh
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoggingOut(false);
    }
  };

  const getInitials = (email: string) => {
    return email
      .split("@")[0]
      .split(".")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "LP";
  };

  const formatDisplayName = (email: string) => {
    const name = email.split("@")[0];
    return name
      .split(".")
      .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
      .join(" ");
  };

  const displayName = user?.email ? formatDisplayName(user.email) : "User";
  const initials = user?.email ? getInitials(user.email) : "LP";
  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all",
            "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "border border-transparent hover:border-border",
            isOpen && "bg-accent border-border"
          )}
        >
          <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">
              {displayName}
            </span>
            {roleLabel && (
              <span className="text-xs text-muted-foreground leading-none mt-0.5">
                {roleLabel}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform hidden md:block",
              isOpen && "transform rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="p-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none truncate">
                {displayName}
              </p>
              {user?.email && (
                <p className="text-xs text-muted-foreground leading-none truncate">
                  {user.email}
                </p>
              )}
              {roleLabel && (
                <Badge
                  variant="secondary"
                  className="w-fit mt-1.5 text-xs px-1.5 py-0"
                >
                  {roleLabel}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          disabled
          className="cursor-not-allowed opacity-50"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Hồ sơ</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className={cn(
            "text-destructive focus:text-destructive cursor-pointer",
            "focus:bg-destructive/10",
            isLoggingOut && "opacity-50 cursor-not-allowed"
          )}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

