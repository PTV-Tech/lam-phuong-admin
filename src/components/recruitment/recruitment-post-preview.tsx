"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { marked } from "marked";
import type { CreateRecruitmentPostRequest } from "@/types/recruitment-post";
import type { Location } from "@/types/location";
import type { JobCategory } from "@/types/job-category";
import type { JobType } from "@/types/job-type";
import type { ProductGroup } from "@/types/product-group";

interface RecruitmentPostPreviewProps {
  formData: CreateRecruitmentPostRequest;
  locations: Location[];
  jobCategories: JobCategory[];
  jobTypes: JobType[];
  productGroups: ProductGroup[];
}

export function RecruitmentPostPreview({
  formData,
  locations,
  jobCategories,
  jobTypes,
  productGroups,
}: RecruitmentPostPreviewProps) {
  // Get names from IDs
  const locationName = useMemo(() => {
    if (!formData.locationId) return null;
    return locations.find((loc) => loc.id === formData.locationId)?.name;
  }, [formData.locationId, locations]);

  const jobCategoryNames = useMemo(() => {
    if (!formData.jobCategoryIds || formData.jobCategoryIds.length === 0)
      return [];
    return jobCategories
      .filter((cat) => formData.jobCategoryIds?.includes(cat.id))
      .map((cat) => cat.name);
  }, [formData.jobCategoryIds, jobCategories]);

  const jobTypeNames = useMemo(() => {
    if (!formData.jobTypeIds || formData.jobTypeIds.length === 0) return [];
    return jobTypes
      .filter((type) => formData.jobTypeIds?.includes(type.id))
      .map((type) => type.name);
  }, [formData.jobTypeIds, jobTypes]);

  const productGroupNames = useMemo(() => {
    if (!formData.productGroupIds || formData.productGroupIds.length === 0)
      return [];
    return productGroups
      .filter((group) => formData.productGroupIds?.includes(group.id))
      .map((group) => group.name);
  }, [formData.productGroupIds, productGroups]);

  // Render markdown to HTML
  const renderMarkdown = (markdown: string | undefined): { __html: string } | undefined => {
    if (!markdown || !markdown.trim()) return undefined;
    try {
      const html = marked.parse(markdown);
      // Ensure we have a string, not a Promise
      const htmlString = typeof html === 'string' ? html : String(html);
      return { __html: htmlString };
    } catch (error) {
      return { __html: markdown };
    }
  };

  // Format deadline
  const formattedDeadline = useMemo(() => {
    if (!formData.deadline) return null;
    try {
      const date = new Date(formData.deadline);
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return formData.deadline;
    }
  }, [formData.deadline]);

  // Combine all tags
  const allTags = useMemo(() => {
    return [
      ...jobCategoryNames,
      ...jobTypeNames,
      ...productGroupNames,
    ].filter(Boolean);
  }, [jobCategoryNames, jobTypeNames, productGroupNames]);

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{formData.title || "Tiêu đề bài tuyển dụng"}</h1>

            {/* Tags and Location */}
            <div className="flex flex-wrap items-center gap-3">
              {allTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-3 py-1 text-sm font-medium"
                >
                  {tag}
                </Badge>
              ))}
              {locationName && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{locationName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Introduce Section */}
          {formData.introduce && (
            <div className="space-y-2">
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={renderMarkdown(formData.introduce)}
              />
            </div>
          )}

          {/* Description Section */}
          {formData.description && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Mô tả công việc</h2>
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={renderMarkdown(formData.description)}
              />
            </div>
          )}

          {/* Requirements Section */}
          {formData.requirements && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                Yêu cầu công việc
              </h2>
              <div
                className="prose prose-sm max-w-none dark:prose-invert text-blue-600 dark:text-blue-300"
                dangerouslySetInnerHTML={renderMarkdown(formData.requirements)}
              />
            </div>
          )}

          {/* Benefits Section */}
          {formData.benefits && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                Quyền lợi
              </h2>
              <div
                className="prose prose-sm max-w-none dark:prose-invert text-blue-600 dark:text-blue-300"
                dangerouslySetInnerHTML={renderMarkdown(formData.benefits)}
              />
            </div>
          )}

          {/* Application Method Section */}
          {formData.applicationMethod && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Cách thức ứng tuyển</h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {formData.applicationMethod}
              </div>
            </div>
          )}

          {/* Deadline */}
          {formattedDeadline && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Hạn nộp hồ sơ:</span> {formattedDeadline}
              </p>
            </div>
          )}

          {/* Apply Button */}
          <div className="pt-4 border-t">
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
              Ứng tuyển ngay
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

