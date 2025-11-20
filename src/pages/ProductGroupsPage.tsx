import { useState, useEffect, useMemo, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductGroupFormDialog } from '@/components/ProductGroupFormDialog'
import { getProductGroups, createProductGroup, updateProductGroup, deleteProductGroup, deleteProductGroups, type ProductGroupFields, type AirtableRecord } from '@/lib/airtable-api'
import { useProductGroups } from '@/hooks/useProductGroups'

export function ProductGroupsPage() {
  const [productGroups, setProductGroups] = useState<AirtableRecord<ProductGroupFields>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] })
  const [deleting, setDeleting] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  // Get cache invalidation function from hook
  const { invalidateCache } = useProductGroups()

  useEffect(() => {
    loadProductGroups()
  }, [])

  const loadProductGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getProductGroups()
      setProductGroups(response.records)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product groups')
      console.error('Error loading product groups:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProductGroup = async (fields: ProductGroupFields) => {
    await createProductGroup(fields)
    // Invalidate cache and reload product groups after creating
    await invalidateCache()
    await loadProductGroups()
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }


  const handleDeleteClick = (ids: string[]) => {
    setDeleteConfirm({ open: true, ids })
  }

  const handleDeleteConfirm = async () => {
    const idsToDelete = deleteConfirm.ids
    if (idsToDelete.length === 0) return

    try {
      setDeleting(true)
      setError(null)
      
      if (idsToDelete.length === 1) {
        await deleteProductGroup(idsToDelete[0])
      } else {
        await deleteProductGroups(idsToDelete)
      }
      
      // Invalidate cache, clear selection and reload
      await invalidateCache()
      setSelectedIds(new Set())
      setDeleteConfirm({ open: false, ids: [] })
      await loadProductGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product group(s)')
      setDeleteConfirm({ open: false, ids: [] })
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ open: false, ids: [] })
  }

  const handleToggleActive = async (productGroupId: string, currentStatus: string) => {
    try {
      setTogglingIds(prev => new Set(prev).add(productGroupId))
      setError(null)
      
      const newStatus = currentStatus === "Active" ? "Disabled" : "Active"
      await updateProductGroup(productGroupId, { Status: newStatus })
      
      // Invalidate cache and update local state optimistically
      await invalidateCache()
      setProductGroups(prev => prev.map(pg => 
        pg.id === productGroupId 
          ? { ...pg, fields: { ...pg.fields, Status: newStatus } }
          : pg
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product group status')
      // Reload to sync with server
      await loadProductGroups()
    } finally {
      setTogglingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(productGroupId)
        return newSet
      })
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Optimized filtering with useMemo
  const filteredProductGroups = useMemo(() => {
    return productGroups.filter((productGroup) => {
      const matchesSearch = debouncedSearchQuery === '' || 
        (productGroup.fields.Name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ?? false)
      const matchesStatus = statusFilter === 'all' || productGroup.fields.Status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [productGroups, debouncedSearchQuery, statusFilter])

  // Clear search function
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearchQuery('')
  }, [])

  // Clear all filters function
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearchQuery('')
    setStatusFilter('all')
  }, [])

  return (
    <AppLayout>
      <div className="min-h-full bg-[#f9fafb]">
        <div className="border-b border-border bg-white backdrop-blur supports-[backdrop-filter]:bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Product Groups</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your product group database
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && (
                  <Button 
                    onClick={() => handleDeleteClick(Array.from(selectedIds))}
                    variant="destructive"
                    size="lg"
                    className="shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Delete ({selectedIds.size})
                  </Button>
                )}
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                >
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
                    className="mr-2"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  Create Product Group
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <span className="mt-4 text-muted-foreground font-medium">Loading product groups...</span>
          </div>
        ) : error ? (
          <Card className="max-w-md mx-auto border-destructive/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-destructive"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <CardTitle className="text-destructive">Error Loading Product Groups</CardTitle>
              <CardDescription className="mt-2">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadProductGroups} className="w-full" size="lg">
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
                  className="mr-2"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : productGroups.length === 0 ? (
          <Card className="max-w-md mx-auto border-dashed">
            <CardHeader className="text-center py-12">
              <div className="mx-auto mb-4 p-4 rounded-full bg-muted w-fit">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <CardTitle>No Product Groups Yet</CardTitle>
              <CardDescription className="mt-2">
                Get started by creating your first product group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                className="w-full" 
                size="lg"
              >
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
                  className="mr-2"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Create Your First Product Group
              </Button>
            </CardContent>
          </Card>
        ) : filteredProductGroups.length === 0 ? (
          <Card className="max-w-md mx-auto border-dashed">
            <CardHeader className="text-center py-12">
              <div className="mx-auto mb-4 p-4 rounded-full bg-muted w-fit">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <CardTitle>No Product Groups Found</CardTitle>
              <CardDescription className="mt-2">
                Try adjusting your search or filter criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(searchQuery || statusFilter !== 'all') && (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="w-full"
                >
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
                    className="mr-2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search and Filter Bar */}
            {productGroups.length > 0 && (
              <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial sm:w-64">
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
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search product groups..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                      >
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
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
                {/* Result Count */}
                {(searchQuery || statusFilter !== 'all') && (
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredProductGroups.length} of {productGroups.length} product group{productGroups.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            {/* Select All Section */}
            {filteredProductGroups.length > 0 && (
              <div className="mb-6 flex items-center gap-4 px-4 py-3 bg-[#f9fafb] rounded-lg border border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filteredProductGroups.length > 0 && filteredProductGroups.every(pg => selectedIds.has(pg.id))}
                    onChange={() => {
                      const allFilteredSelected = filteredProductGroups.every(pg => selectedIds.has(pg.id))
                      if (allFilteredSelected) {
                        // Deselect all filtered items
                        const newSelectedIds = new Set(selectedIds)
                        filteredProductGroups.forEach(pg => newSelectedIds.delete(pg.id))
                        setSelectedIds(newSelectedIds)
                      } else {
                        // Select all filtered items
                        const newSelectedIds = new Set(selectedIds)
                        filteredProductGroups.forEach(pg => newSelectedIds.add(pg.id))
                        setSelectedIds(newSelectedIds)
                      }
                    }}
                    className="w-6 h-6 rounded-md transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Select all ({filteredProductGroups.filter(pg => selectedIds.has(pg.id)).length} of {filteredProductGroups.length} selected)
                  </span>
                </label>
              </div>
            )}
            <div className="grid gap-6 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProductGroups.map((productGroup) => (
                <Card 
                  key={productGroup.id}
                  className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ease-out ${
                    selectedIds.has(productGroup.id) 
                      ? 'border-primary border-2 shadow-lg translate-y-0' 
                      : 'border-[#e5e7eb] shadow-sm hover:border-[#d1d5db] hover:-translate-y-1 hover:shadow-lg'
                  }`}
                >
                  {/* Delete Button - Top Right */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick([productGroup.id])
                    }}
                    className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 text-[#ef4444] hover:text-[#dc2626] hover:bg-red-50 flex-shrink-0 transition-all duration-200 rounded-lg z-10"
                  >
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
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </Button>

                  <CardHeader className="pb-4 pt-6 px-6">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(productGroup.id)}
                        onChange={() => handleToggleSelect(productGroup.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded-md flex-shrink-0 mt-1 transition-all duration-200 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2.5 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-all duration-200 flex-shrink-0 shadow-sm">
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
                              className="text-blue-600"
                            >
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <CardTitle className="text-lg font-semibold break-words leading-tight text-foreground">
                              {productGroup.fields.Name || 'Unnamed Product Group'}
                            </CardTitle>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent className="pt-0 px-6 pb-6">
                  <div className="flex items-center justify-between mb-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-medium">Status:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(productGroup.id, productGroup.fields.Status ?? "Active")
                        }}
                        disabled={togglingIds.has(productGroup.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                          productGroup.fields.Status === "Active"
                            ? 'bg-[#10b981] focus:ring-[#10b981]'
                            : 'bg-[#e5e7eb] focus:ring-gray-400'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                            productGroup.fields.Status === "Active" ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-medium ${
                        productGroup.fields.Status === "Active"
                          ? 'text-[#10b981]'
                          : 'text-muted-foreground'
                      }`}>
                        {productGroup.fields.Status === "Active" ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="text-xs">
                      Created {new Date(productGroup.createdTime).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </>
        )}
        </div>
      </div>
      <ProductGroupFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleCreateProductGroup}
      />
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
          onClick={handleDeleteCancel}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200" />
          
        {/* Dialog Container */}
          <div 
            className="relative w-full max-w-md bg-white rounded-lg shadow-2xl border-2 border-border overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/20 flex-shrink-0 mt-0.5">
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
                    className="text-destructive"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-foreground leading-tight">
                    Delete Product Group{deleteConfirm.ids.length > 1 ? 's' : ''}?
                  </h2>
                  <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                    {deleteConfirm.ids.length === 1
                      ? 'This action cannot be undone. The product group will be permanently deleted.'
                      : `Are you sure you want to delete ${deleteConfirm.ids.length} product groups? This action cannot be undone.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t-2 border-border my-5" />

            {/* Action Buttons */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-end gap-3">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={handleDeleteCancel} 
                  disabled={deleting}
                  className="px-5 h-9 font-medium text-foreground/90 hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-5 h-9 font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
                >
                  {deleting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                      <span>Deleting...</span>
                    </span>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
