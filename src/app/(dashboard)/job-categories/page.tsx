import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { JobCategoriesPageClient } from "@/components/job-categories/job-categories-page-client";
import { getJobCategories } from "@/lib/job-categories";
import type { JobCategory } from "@/types/job-category";

export default async function JobCategoriesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lp_auth_token")?.value;

  let jobCategories: JobCategory[] = [];
  try {
    jobCategories = await getJobCategories(token || undefined);
  } catch (error) {
    // Redirect to sign-in on unauthorized error
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/sign-in?unauthorized=true");
    }
    // Only log non-unauthorized errors
    if (error instanceof Error && error.message !== "Unauthorized") {
      console.error("Failed to fetch job categories:", error);
    }
    // Continue with empty array on error
  }

  return <JobCategoriesPageClient initialJobCategories={jobCategories} />;
}

