"use client";

import { Menu, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { UserMenu } from "@/components/auth/user-menu";
import { ModeToggle } from "@/components/theme/mode-toggle";
import type { User } from "@/types/auth";

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Desktop Logo */}
        <div className="hidden md:flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2">
            <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Lam Phương Admin</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}

