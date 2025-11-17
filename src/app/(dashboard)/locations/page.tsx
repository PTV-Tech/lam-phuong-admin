import { cookies } from "next/headers";
import { LocationsPageClient } from "@/components/locations/locations-page-client";
import { getLocations } from "@/lib/locations";
import type { Location } from "@/types/location";

export default async function LocationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("lp_auth_token")?.value;

  let locations: Location[] = [];
  try {
    locations = await getLocations(token || undefined);
  } catch (error) {
    // Only log non-unauthorized errors
    if (error instanceof Error && error.message !== "Unauthorized") {
      console.error("Failed to fetch locations:", error);
    }
    // Continue with empty array on error
  }

  return <LocationsPageClient initialLocations={locations} />;
}

