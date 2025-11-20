import { lazy, Suspense } from 'react'

// Lazy load SimpleMDE and its CSS
const SimpleMDE = lazy(() => 
  import('react-simplemde-editor').then(module => {
    // Import CSS as side effect
    import('easymde/dist/easymde.min.css')
    return { default: module.default }
  })
)

interface LazySimpleMDEProps {
  value: string
  onChange: (value: string) => void
  options?: Record<string, unknown>
}

const EditorLoader = () => (
  <div className="flex items-center justify-center h-32 border border-gray-300 rounded-lg bg-gray-50">
    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
  </div>
)

export function LazySimpleMDE({ value, onChange, options }: LazySimpleMDEProps) {
  return (
    <Suspense fallback={<EditorLoader />}>
      <SimpleMDE value={value} onChange={onChange} options={options} />
    </Suspense>
  )
}

