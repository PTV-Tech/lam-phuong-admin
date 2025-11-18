import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UsersPageClient } from "@/components/users/users-page-client";
import { getUsers } from "@/lib/users";
import type { User } from "@/types/auth";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lp_auth_token")?.value;
  const userCookie = cookieStore.get("lp_auth_user")?.value;

  // Check user role from cookie
  let user: User | null = null;
  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie)) as User;
    } catch {
      user = null;
    }
  }

  // Only Admin and Super Admin can access users page
  const allowedRoles = ["Admin", "Super Admin"];
  if (!user || !user.role || !allowedRoles.includes(user.role)) {
    redirect("/");
  }

  let users: User[] = [];
  try {
    users = await getUsers(token || undefined);
  } catch (error) {
    // Redirect to sign-in on unauthorized error
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/sign-in?unauthorized=true");
    }
    // Only log non-unauthorized errors
    if (error instanceof Error && error.message !== "Unauthorized") {
      console.error("Failed to fetch users:", error);
    }
    // Continue with empty array on error
  }

  return <UsersPageClient initialUsers={users} currentUser={user} />;
}

