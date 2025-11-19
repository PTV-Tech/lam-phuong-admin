import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ProductGroupFields, generateUniqueProductGroupSlug } from "@/lib/airtable-api";

interface ProductGroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: ProductGroupFields) => Promise<void>;
}

export function ProductGroupFormDialog({
  open,
  onClose,
  onSubmit,
}: ProductGroupFormDialogProps) {
  const [formData, setFormData] = useState<ProductGroupFields>({
    Name: "",
  });
  const [loading, setLoading] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.Name?.trim()) {
        throw new Error("Name is required");
      }

      // Generate unique slug from name
      setGeneratingSlug(true);
      let uniqueSlug: string;
      try {
        uniqueSlug = await generateUniqueProductGroupSlug(formData.Name.trim());
      } catch (slugError) {
        throw new Error(
          slugError instanceof Error 
            ? `Failed to generate unique slug: ${slugError.message}`
            : "Failed to generate unique slug"
        );
      } finally {
        setGeneratingSlug(false);
      }

      // Submit with name, unique slug, and default Active status
      await onSubmit({
        ...formData,
        Slug: uniqueSlug,
        Status: "Active",
      });
      // Reset form
      setFormData({
        Name: "",
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create product group"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setFormData({
      Name: value,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />

      {/* Dialog Container */}
      <div
        className="relative w-full max-w-md bg-white rounded-lg shadow-2xl border-2 border-border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/20 flex-shrink-0 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">
                New Product Group
              </h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Add a product group to your database
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-5">
            {/* Input Field */}
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Product Group Name
              </Label>
              <Input
                id="name"
                value={formData.Name || ""}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Enter product group name"
                required
                disabled={loading || generatingSlug}
                autoFocus
                className="h-10 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all mt-3"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive animate-in slide-in-from-top-1 duration-200">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="flex-1">{error}</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t-2 border-border my-5" />

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading || generatingSlug}
              className="px-5 h-9 font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={loading || generatingSlug || !formData.Name?.trim()}
              className="px-5 h-9 font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
            >
              {generatingSlug ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  <span>Generating slug...</span>
                </span>
              ) : loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  <span>Creating...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  <span>Create</span>
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

