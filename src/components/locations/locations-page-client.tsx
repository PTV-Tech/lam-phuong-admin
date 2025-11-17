"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateLocationDialog } from "./create-location-dialog";
import { DeleteLocationDialog } from "./delete-location-dialog";
import type { Location } from "@/types/location";

interface LocationsPageClientProps {
  initialLocations: Location[];
}

export function LocationsPageClient({
  initialLocations,
}: LocationsPageClientProps) {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteLocation, setDeleteLocation] = useState<Location | null>(null);

  const handleLocationCreated = useCallback(
    (newLocation: Location) => {
      setLocations((prev) => [...prev, newLocation]);
      setIsCreateDialogOpen(false);
      router.refresh();
    },
    [router]
  );

  const handleLocationDeleted = useCallback(
    (deletedSlug: string) => {
      setLocations((prev) => prev.filter((loc) => loc.slug !== deletedSlug));
      setDeleteLocation(null);
      router.refresh();
    },
    [router]
  );

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Địa điểm</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quản lý danh sách địa điểm
                </p>
              </div>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm địa điểm
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Chưa có địa điểm nào
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Bắt đầu bằng cách thêm địa điểm đầu tiên của bạn
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm địa điểm
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">STT</TableHead>
                  <TableHead>Tên địa điểm</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location, index) => (
                  <TableRow key={location.id}>
                    <TableCell className="text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {location.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {location.slug}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteLocation(location)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateLocationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onLocationCreated={handleLocationCreated}
      />

      {deleteLocation && (
        <DeleteLocationDialog
          location={deleteLocation}
          open={!!deleteLocation}
          onOpenChange={(open) => !open && setDeleteLocation(null)}
          onLocationDeleted={handleLocationDeleted}
        />
      )}
    </div>
  );
}

