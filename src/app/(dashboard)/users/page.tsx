import { cookies } from "next/headers";
import { UsersPageClient } from "@/components/users/users-page-client";
import { getUsers } from "@/lib/users";
import type { User } from "@/types/auth";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lp_auth_token")?.value;

  let users: User[] = [];
  try {
    users = await getUsers(token || undefined);
  } catch (error) {
    // Only log non-unauthorized errors
    if (error instanceof Error && error.message !== "Unauthorized") {
      console.error("Failed to fetch users:", error);
    }
    // Continue with empty array on error
  }

  return <UsersPageClient initialUsers={users} />;
}

