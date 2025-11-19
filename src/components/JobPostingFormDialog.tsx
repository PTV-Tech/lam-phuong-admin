import { useState, useEffect, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  type JobPostingFields, 
  generateUniqueJobPostingSlug,
  getLocations,
  getJobCategories,
  getJobTypes,
  getProductGroups,
  type AirtableRecord,
  type LocationFields,
  type JobCategoryFields,
  type JobTypeFields,
  type ProductGroupFields
} from "@/lib/airtable-api";

interface JobPostingFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: JobPostingFields) => Promise<void>;
  editingPosting?: AirtableRecord<JobPostingFields> | null;
}

export function JobPostingFormDialog({
  open,
  onClose,
  onSubmit,
  editingPosting,
}: JobPostingFormDialogProps) {
  const [formData, setFormData] = useState<JobPostingFields>({
    'Tiêu đề': "",
    'Giới thiệu': "",
    'Mô tả công việc': "",
    'Yêu cầu': "",
    'Quyền lợi': "",
    'Cách thức ứng tuyển': "",
    'Hạn chót nhận': "",
    'Khu vực': [],
    'Danh mục công việc': [],
    'Loại công việc': [],
    'Nhóm sản phẩm': [],
  });
  const [loading, setLoading] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Options for multi-selects
  const [locations, setLocations] = useState<AirtableRecord<LocationFields>[]>([]);
  const [jobCategories, setJobCategories] = useState<AirtableRecord<JobCategoryFields>[]>([]);
  const [jobTypes, setJobTypes] = useState<AirtableRecord<JobTypeFields>[]>([]);
  const [productGroups, setProductGroups] = useState<AirtableRecord<ProductGroupFields>[]>([]);

  useEffect(() => {
    if (open) {
      loadOptions();
      if (editingPosting) {
        // Populate form with editing data
        const fields = editingPosting.fields;
        // Format date for input (YYYY-MM-DD)
        let deadlineDate = "";
        if (fields['Hạn chót nhận']) {
          try {
            const date = new Date(fields['Hạn chót nhận']);
            if (!isNaN(date.getTime())) {
              deadlineDate = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Error parsing date:', e);
          }
        }
        
        setFormData({
          'Tiêu đề': fields['Tiêu đề'] || "",
          'Giới thiệu': fields['Giới thiệu'] || "",
          'Mô tả công việc': fields['Mô tả công việc'] || "",
          'Yêu cầu': fields['Yêu cầu'] || "",
          'Quyền lợi': fields['Quyền lợi'] || "",
          'Cách thức ứng tuyển': fields['Cách thức ứng tuyển'] || "",
          'Hạn chót nhận': deadlineDate,
          'Khu vực': Array.isArray(fields['Khu vực']) ? fields['Khu vực'] : [],
          'Danh mục công việc': Array.isArray(fields['Danh mục công việc']) ? fields['Danh mục công việc'] : [],
          'Loại công việc': Array.isArray(fields['Loại công việc']) ? fields['Loại công việc'] : [],
          'Nhóm sản phẩm': Array.isArray(fields['Nhóm sản phẩm']) ? fields['Nhóm sản phẩm'] : [],
        });
      } else {
        // Reset form
        setFormData({
          'Tiêu đề': "",
          'Giới thiệu': "",
          'Mô tả công việc': "",
          'Yêu cầu': "",
          'Quyền lợi': "",
          'Cách thức ứng tuyển': "",
          'Hạn chót nhận': "",
          'Khu vực': [],
          'Danh mục công việc': [],
          'Loại công việc': [],
          'Nhóm sản phẩm': [],
        });
      }
    }
  }, [open, editingPosting]);

  const loadOptions = async () => {
    try {
      const [locationsRes, categoriesRes, typesRes, groupsRes] = await Promise.all([
        getLocations(),
        getJobCategories(),
        getJobTypes(),
        getProductGroups(),
      ]);
      setLocations(locationsRes.records.filter(loc => loc.fields.Status === "Active"));
      setJobCategories(categoriesRes.records.filter(cat => cat.fields.Status === "Active"));
      setJobTypes(typesRes.records.filter(type => type.fields.Status === "Active"));
      setProductGroups(groupsRes.records.filter(group => group.fields.Status === "Active"));
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData['Tiêu đề']?.trim()) {
        throw new Error("Tiêu đề is required");
      }

      // Generate unique slug from title
      setGeneratingSlug(true);
      let uniqueSlug: string;
      try {
        if (editingPosting && formData['Tiêu đề'] === editingPosting.fields['Tiêu đề']) {
          // Keep existing slug if title hasn't changed
          uniqueSlug = editingPosting.fields.Slug || await generateUniqueJobPostingSlug(formData['Tiêu đề'].trim());
        } else {
          // Generate new slug if title changed or creating new
          uniqueSlug = await generateUniqueJobPostingSlug(formData['Tiêu đề'].trim());
        }
      } catch (slugError) {
        throw new Error(
          slugError instanceof Error 
            ? `Failed to generate unique slug: ${slugError.message}`
            : "Failed to generate unique slug"
        );
      } finally {
        setGeneratingSlug(false);
      }

      // Format date to ISO 8601
      const deadlineDate = formData['Hạn chót nhận'] 
        ? new Date(formData['Hạn chót nhận']).toISOString().split('T')[0]
        : undefined;

      // Submit with all fields
      await onSubmit({
        ...formData,
        Slug: uniqueSlug,
        'Hạn chót nhận': deadlineDate,
      });
      
      // Reset form
      setFormData({
        'Tiêu đề': "",
        'Giới thiệu': "",
        'Mô tả công việc': "",
        'Yêu cầu': "",
        'Quyền lợi': "",
        'Cách thức ứng tuyển': "",
        'Hạn chót nhận': "",
        'Khu vực': [],
        'Danh mục công việc': [],
        'Loại công việc': [],
        'Nhóm sản phẩm': [],
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save job posting"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMultiSelect = (field: keyof JobPostingFields, value: string) => {
    setFormData(prev => {
      const current = (prev[field] as string[]) || [];
      const newValue = current.includes(value)
        ? current.filter(id => id !== value)
        : [...current, value];
      return { ...prev, [field]: newValue };
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200 overflow-y-auto"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />

      {/* Dialog Container */}
      <div
        className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl border-2 border-border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="px-6 pt-6 pb-5 border-b border-border">
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {editingPosting ? 'Edit Job Posting' : 'New Job Posting'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {editingPosting ? 'Update job posting details' : 'Create a new job posting'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto py-6">
            {/* Title */}
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-medium text-foreground">
                Tiêu đề <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData['Tiêu đề'] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Tiêu đề': e.target.value }))}
                placeholder="Enter job title"
                required
                disabled={loading || generatingSlug}
                className="h-10"
              />
            </div>

            {/* Introduction */}
            <div className="space-y-3">
              <Label htmlFor="introduction" className="text-sm font-medium text-foreground">
                Giới thiệu
              </Label>
              <Textarea
                id="introduction"
                value={formData['Giới thiệu'] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Giới thiệu': e.target.value }))}
                placeholder="Enter introduction"
                disabled={loading}
                rows={3}
              />
            </div>

            {/* Job Description */}
            <div className="space-y-3">
              <Label htmlFor="jobDescription" className="text-sm font-medium text-foreground">
                Mô tả công việc
              </Label>
              <Textarea
                id="jobDescription"
                value={formData['Mô tả công việc'] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Mô tả công việc': e.target.value }))}
                placeholder="Enter job description"
                disabled={loading}
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            {/* Requirements */}
            <div className="space-y-3">
              <Label htmlFor="requirements" className="text-sm font-medium text-foreground">
                Yêu cầu
              </Label>
              <Textarea
                id="requirements"
                value={formData['Yêu cầu'] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Yêu cầu': e.target.value }))}
                placeholder="Enter requirements"
                disabled={loading}
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <Label htmlFor="benefits" className="text-sm font-medium text-foreground">
                Quyền lợi
              </Label>
              <Textarea
                id="benefits"
                value={formData['Quyền lợi'] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Quyền lợi': e.target.value }))}
                placeholder="Enter benefits"
                disabled={loading}
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            {/* Application Method */}
            <div className="space-y-3">
              <Label htmlFor="applicationMethod" className="text-sm font-medium text-foreground">
                Cách thức ứng tuyển
              </Label>
              <Textarea
                id="applicationMethod"
                value={formData['Cách thức ứng tuyển'] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Cách thức ứng tuyển': e.target.value }))}
                placeholder="Enter application method"
                disabled={loading}
                rows={3}
              />
            </div>

            {/* Deadline */}
            <div className="space-y-3">
              <Label htmlFor="deadline" className="text-sm font-medium text-foreground">
                Hạn chót nhận
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData['Hạn chót nhận'] || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, 'Hạn chót nhận': e.target.value }))}
                disabled={loading}
                className="h-10"
              />
            </div>

            {/* Multi-selects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Locations */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Khu vực
                </Label>
                <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active locations available</p>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((location) => (
                        <label key={location.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(formData['Khu vực'] || []).includes(location.id)}
                            onChange={() => handleMultiSelect('Khu vực', location.id)}
                            disabled={loading}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm">{location.fields.Name || 'Unnamed'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Job Categories */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Danh mục công việc
                </Label>
                <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                  {jobCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active categories available</p>
                  ) : (
                    <div className="space-y-2">
                      {jobCategories.map((category) => (
                        <label key={category.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(formData['Danh mục công việc'] || []).includes(category.id)}
                            onChange={() => handleMultiSelect('Danh mục công việc', category.id)}
                            disabled={loading}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm">{category.fields.Name || 'Unnamed'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Job Types */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Loại công việc
                </Label>
                <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                  {jobTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active types available</p>
                  ) : (
                    <div className="space-y-2">
                      {jobTypes.map((type) => (
                        <label key={type.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(formData['Loại công việc'] || []).includes(type.id)}
                            onChange={() => handleMultiSelect('Loại công việc', type.id)}
                            disabled={loading}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm">{type.fields.Name || 'Unnamed'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Groups */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Nhóm sản phẩm
                </Label>
                <div className="border border-input rounded-md p-3 max-h-40 overflow-y-auto bg-background">
                  {productGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active groups available</p>
                  ) : (
                    <div className="space-y-2">
                      {productGroups.map((group) => (
                        <label key={group.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={(formData['Nhóm sản phẩm'] || []).includes(group.id)}
                            onChange={() => handleMultiSelect('Nhóm sản phẩm', group.id)}
                            disabled={loading}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm">{group.fields.Name || 'Unnamed'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
          <div className="flex items-center justify-end gap-3">
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
              disabled={loading || generatingSlug || !formData['Tiêu đề']?.trim()}
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
                  <span>{editingPosting ? 'Updating...' : 'Creating...'}</span>
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
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>{editingPosting ? 'Update' : 'Create'}</span>
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

