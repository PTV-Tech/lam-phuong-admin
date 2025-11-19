import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/MultiSelect'
import SimpleMDE from 'react-simplemde-editor'
import 'easymde/dist/easymde.min.css'
import ReactMarkdown from 'react-markdown'
import slugify from 'slugify'
import {
  getJobPostings,
  createJobPosting,
  updateJobPosting,
  generateUniqueJobPostingSlug,
  type JobPostingFields,
  type AirtableRecord,
  type LocationFields,
  type JobCategoryFields,
  type JobTypeFields,
  type ProductGroupFields,
} from '@/lib/airtable-api'
import { useLazyData } from '@/hooks/useLazyData'

const simpleMDEConfig = {
  toolbar: [
    'bold',
    'italic',
    'heading',
    '|',
    'unordered-list',
    'ordered-list',
    '|',
    'link',
    '|',
    'preview',
  ],
  spellChecker: false,
  status: false,
  placeholder: 'Enter content in Markdown format...',
}

export function JobPostingFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEditMode = Boolean(id)

  const [formData, setFormData] = useState<JobPostingFields>({
    'Tiêu đề': '',
    'Giới thiệu': '',
    'Mô tả công việc': '',
    'Yêu cầu': '',
    'Quyền lợi': '',
    'Cách thức ứng tuyển': '',
    'Hạn chót nhận': '',
    'Khu vực': [],
    'Danh mục công việc': [],
    'Loại công việc': [],
    'Nhóm sản phẩm': [],
  })
  const [originalTitle, setOriginalTitle] = useState('')
  const [slugPreview, setSlugPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingSlug, setGeneratingSlug] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Lazy-loaded data with caching
  const {
    dataCache,
    loading: lazyLoading,
    fetchLocations,
    fetchJobCategories,
    fetchJobTypes,
    fetchProductGroups,
  } = useLazyData()

  useEffect(() => {
    if (isEditMode && id) {
      loadJobPosting(id)
    }
  }, [isEditMode, id])

  useEffect(() => {
    // Update slug preview when title changes
    if (formData['Tiêu đề']) {
      const baseSlug = slugify(formData['Tiêu đề'].trim(), {
        lower: true,
        strict: true,
      })
      setSlugPreview(baseSlug)
    } else {
      setSlugPreview('')
    }
  }, [formData['Tiêu đề']])

  // Track unsaved changes
  useEffect(() => {
    if (isEditMode) {
      setHasUnsavedChanges(true)
    }
  }, [formData, isEditMode])


  const loadJobPosting = async (postingId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getJobPostings()
      const posting = response.records.find(p => p.id === postingId)

      if (!posting) {
        setError('Job posting not found')
        return
      }

      const fields = posting.fields
      let deadlineDate = ''
      if (fields['Hạn chót nhận']) {
        try {
          const date = new Date(fields['Hạn chót nhận'])
          if (!isNaN(date.getTime())) {
            deadlineDate = date.toISOString().split('T')[0]
          }
        } catch (e) {
          console.error('Error parsing date:', e)
        }
      }

      const loadedFields = {
        'Tiêu đề': fields['Tiêu đề'] || '',
        'Giới thiệu': fields['Giới thiệu'] || '',
        'Mô tả công việc': fields['Mô tả công việc'] || '',
        'Yêu cầu': fields['Yêu cầu'] || '',
        'Quyền lợi': fields['Quyền lợi'] || '',
        'Cách thức ứng tuyển': fields['Cách thức ứng tuyển'] || '',
        'Hạn chót nhận': deadlineDate,
        'Khu vực': Array.isArray(fields['Khu vực']) ? fields['Khu vực'] : [],
        'Danh mục công việc': Array.isArray(fields['Danh mục công việc']) ? fields['Danh mục công việc'] : [],
        'Loại công việc': Array.isArray(fields['Loại công việc']) ? fields['Loại công việc'] : [],
        'Nhóm sản phẩm': Array.isArray(fields['Nhóm sản phẩm']) ? fields['Nhóm sản phẩm'] : [],
      }
      
      setFormData(loadedFields)
      setOriginalTitle(fields['Tiêu đề'] || '')
      setHasUnsavedChanges(false)

      // Pre-fetch data for fields that have selected values (for edit mode)
      // This ensures selected items are visible when dropdown opens
      if (loadedFields['Khu vực'].length > 0) {
        fetchLocations().catch(console.error)
      }
      if (loadedFields['Danh mục công việc'].length > 0) {
        fetchJobCategories().catch(console.error)
      }
      if (loadedFields['Loại công việc'].length > 0) {
        fetchJobTypes().catch(console.error)
      }
      if (loadedFields['Nhóm sản phẩm'].length > 0) {
        fetchProductGroups().catch(console.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job posting')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    navigate('/job-postings')
  }, [hasUnsavedChanges, navigate])

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData['Tiêu đề']?.trim()) {
      setError('Tiêu đề is required')
      return
    }

    try {
      setSaving(true)
      setGeneratingSlug(true)

      // Generate unique slug
      let uniqueSlug: string
      try {
        if (isEditMode && formData['Tiêu đề'] === originalTitle) {
          // Keep existing slug if title hasn't changed
          const response = await getJobPostings()
          const posting = response.records.find(p => p.id === id)
          uniqueSlug = posting?.fields.Slug || await generateUniqueJobPostingSlug(formData['Tiêu đề'].trim())
        } else {
          // Generate new slug if title changed or creating new
          uniqueSlug = await generateUniqueJobPostingSlug(formData['Tiêu đề'].trim())
        }
      } catch (slugError) {
        throw new Error(
          slugError instanceof Error
            ? `Failed to generate unique slug: ${slugError.message}`
            : 'Failed to generate unique slug'
        )
      } finally {
        setGeneratingSlug(false)
      }

      // Format date to ISO 8601
      const deadlineDate = formData['Hạn chót nhận']
        ? new Date(formData['Hạn chót nhận']).toISOString().split('T')[0]
        : undefined

      // Prepare fields for submission
      const fieldsToSubmit: JobPostingFields = {
        ...formData,
        Slug: uniqueSlug,
        'Hạn chót nhận': deadlineDate,
      }

      if (isEditMode && id) {
        await updateJobPosting(id, fieldsToSubmit)
      } else {
        await createJobPosting(fieldsToSubmit)
      }

      setHasUnsavedChanges(false)
      navigate('/job-postings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job posting')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <span className="mt-4 text-muted-foreground font-medium">Loading job posting...</span>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-full bg-[#f9fafb]">
        <div className="border-b border-border bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {isEditMode ? 'Edit Job Posting' : 'Create Job Posting'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isEditMode ? 'Update job posting details' : 'Create a new job posting'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || generatingSlug || !formData['Tiêu đề']?.trim()}
                  className="px-5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {generatingSlug ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      <span>Generating slug...</span>
                    </span>
                  ) : saving ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
              <div className="flex items-start gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
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
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info Section */}
            <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-6">Basic Info</h2>
              
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-foreground">
                    Tiêu đề <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData['Tiêu đề'] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, 'Tiêu đề': e.target.value }))}
                    placeholder="Enter job title"
                    required
                    disabled={saving}
                    className="h-10"
                  />
                  {slugPreview && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Slug preview:</span>
                      <code className="px-2 py-1 bg-muted rounded text-foreground font-mono">
                        {slugPreview}
                      </code>
                    </div>
                  )}
                </div>

                {/* Introduction */}
                <div className="space-y-2">
                  <Label htmlFor="introduction" className="text-sm font-medium text-foreground">
                    Giới thiệu
                  </Label>
                  <Textarea
                    id="introduction"
                    value={formData['Giới thiệu'] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, 'Giới thiệu': e.target.value }))}
                    placeholder="Enter introduction"
                    disabled={saving}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Job Details Section */}
            <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-6">Job Details</h2>
              
              <div className="space-y-6">
                {/* Job Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Mô tả công việc
                  </Label>
                  <SimpleMDE
                    value={formData['Mô tả công việc'] || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, 'Mô tả công việc': value }))}
                    options={simpleMDEConfig}
                  />
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Yêu cầu
                  </Label>
                  <SimpleMDE
                    value={formData['Yêu cầu'] || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, 'Yêu cầu': value }))}
                    options={simpleMDEConfig}
                  />
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Quyền lợi
                  </Label>
                  <SimpleMDE
                    value={formData['Quyền lợi'] || ''}
                    onChange={(value) => setFormData(prev => ({ ...prev, 'Quyền lợi': value }))}
                    options={simpleMDEConfig}
                  />
                </div>
              </div>
            </div>

            {/* Application Section */}
            <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-6">Application</h2>
              
              <div className="space-y-6">
                {/* Application Method */}
                <div className="space-y-2">
                  <Label htmlFor="applicationMethod" className="text-sm font-medium text-foreground">
                    Cách thức ứng tuyển
                  </Label>
                  <Textarea
                    id="applicationMethod"
                    value={formData['Cách thức ứng tuyển'] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, 'Cách thức ứng tuyển': e.target.value }))}
                    placeholder="Enter application method"
                    disabled={saving}
                    rows={4}
                  />
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-sm font-medium text-foreground">
                    Hạn chót nhận
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData['Hạn chót nhận'] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, 'Hạn chót nhận': e.target.value }))}
                    disabled={saving}
                    className="h-10 max-w-xs"
                  />
                </div>
              </div>
            </div>

            {/* Classifications Section */}
            <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-foreground mb-6">Classifications</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Locations */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Khu vực
                  </Label>
                  <MultiSelect
                    options={(dataCache.locations || []).map(loc => ({
                      id: loc.id,
                      label: loc.fields.Name || 'Unnamed',
                    }))}
                    value={formData['Khu vực'] || []}
                    onChange={(value) => setFormData(prev => ({ ...prev, 'Khu vực': value }))}
                    placeholder="Select locations..."
                    disabled={saving}
                    loading={lazyLoading.locations}
                    onOpen={fetchLocations}
                  />
                </div>

                {/* Job Categories */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Danh mục công việc
                  </Label>
                  <MultiSelect
                    options={(dataCache.jobCategories || []).map(cat => ({
                      id: cat.id,
                      label: cat.fields.Name || 'Unnamed',
                    }))}
                    value={formData['Danh mục công việc'] || []}
                    onChange={(value) => setFormData(prev => ({ ...prev, 'Danh mục công việc': value }))}
                    placeholder="Select categories..."
                    disabled={saving}
                    loading={lazyLoading.jobCategories}
                    onOpen={fetchJobCategories}
                  />
                </div>

                {/* Job Types */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Loại công việc
                  </Label>
                  <MultiSelect
                    options={(dataCache.jobTypes || []).map(type => ({
                      id: type.id,
                      label: type.fields.Name || 'Unnamed',
                    }))}
                    value={formData['Loại công việc'] || []}
                    onChange={(value) => setFormData(prev => ({ ...prev, 'Loại công việc': value }))}
                    placeholder="Select types..."
                    disabled={saving}
                    loading={lazyLoading.jobTypes}
                    onOpen={fetchJobTypes}
                  />
                </div>

                {/* Product Groups */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Nhóm sản phẩm
                  </Label>
                  <MultiSelect
                    options={(dataCache.productGroups || []).map(group => ({
                      id: group.id,
                      label: group.fields.Name || 'Unnamed',
                    }))}
                    value={formData['Nhóm sản phẩm'] || []}
                    onChange={(value) => setFormData(prev => ({ ...prev, 'Nhóm sản phẩm': value }))}
                    placeholder="Select product groups..."
                    disabled={saving}
                    loading={lazyLoading.productGroups}
                    onOpen={fetchProductGroups}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pb-8">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={saving}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || generatingSlug || !formData['Tiêu đề']?.trim()}
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generatingSlug ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                    <span>Generating slug...</span>
                  </span>
                ) : saving ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                    <span>Saving...</span>
                  </span>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

