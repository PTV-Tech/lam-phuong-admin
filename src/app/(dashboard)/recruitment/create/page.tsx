import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CreateRecruitmentPostPageClient } from "@/components/recruitment/create-recruitment-post-page-client";
import { getLocations } from "@/lib/locations";
import { getJobCategories } from "@/lib/job-categories";
import { getJobTypes } from "@/lib/job-types";
import { getProductGroups } from "@/lib/product-groups";
import type { Location } from "@/types/location";
import type { JobCategory } from "@/types/job-category";
import type { JobType } from "@/types/job-type";
import type { ProductGroup } from "@/types/product-group";

export default async function CreateRecruitmentPostPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lp_auth_token")?.value;

  // Fetch options for dropdowns
  let locations: Location[] = [];
  let jobCategories: JobCategory[] = [];
  let jobTypes: JobType[] = [];
  let productGroups: ProductGroup[] = [];

  try {
    [locations, jobCategories, jobTypes, productGroups] = await Promise.all([
      getLocations(token || undefined),
      getJobCategories(token || undefined),
      getJobTypes(token || undefined),
      getProductGroups(token || undefined),
    ]);
  } catch (error) {
    // Redirect to sign-in on unauthorized error
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/sign-in?unauthorized=true");
    }
    // Continue with empty arrays on error
    if (error instanceof Error && error.message !== "Unauthorized") {
      console.error("Failed to fetch options:", error);
    }
  }

  return (
    <CreateRecruitmentPostPageClient
      locations={locations}
      jobCategories={jobCategories}
      jobTypes={jobTypes}
      productGroups={productGroups}
    />
  );
}

