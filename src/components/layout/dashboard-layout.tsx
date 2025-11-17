import { cookies } from "next/headers";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import type { User } from "@/types/auth";

export async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("lp_auth_user")?.value;

  // Parse user data from cookie
  let user: User | null = null;
  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie)) as User;
    } catch {
      user = null;
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar user={user} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}

