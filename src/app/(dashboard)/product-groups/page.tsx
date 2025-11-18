import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProductGroupsPageClient } from "@/components/product-groups/product-groups-page-client";
import { getProductGroups } from "@/lib/product-groups";
import type { ProductGroup } from "@/types/product-group";

export default async function ProductGroupsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lp_auth_token")?.value;

  let productGroups: ProductGroup[] = [];
  try {
    productGroups = await getProductGroups(token || undefined);
  } catch (error) {
    // Redirect to sign-in on unauthorized error
    if (error instanceof Error && error.message === "Unauthorized") {
      redirect("/sign-in?unauthorized=true");
    }
    // Only log non-unauthorized errors
    if (error instanceof Error && error.message !== "Unauthorized") {
      console.error("Failed to fetch product groups:", error);
    }
    // Continue with empty array on error
  }

  return <ProductGroupsPageClient initialProductGroups={productGroups} />;
}

