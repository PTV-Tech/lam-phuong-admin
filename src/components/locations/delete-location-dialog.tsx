"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteLocation } from "@/lib/locations";
import type { Location } from "@/types/location";

interface DeleteLocationDialogProps {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationDeleted: (slug: string) => void;
}

export function DeleteLocationDialog({
  location,
  open,
  onOpenChange,
  onLocationDeleted,
}: DeleteLocationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteLocation(location.slug);
      onLocationDeleted(location.slug);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể xóa địa điểm"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>Xác nhận xóa địa điểm</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Bạn có chắc chắn muốn xóa địa điểm{" "}
            <span className="font-semibold text-foreground">
              {location.name}
            </span>
            ? Hành động này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              "Đang xóa..."
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa địa điểm
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

