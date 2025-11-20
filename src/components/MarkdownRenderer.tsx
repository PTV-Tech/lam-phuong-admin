import { lazy, Suspense } from 'react'
import { type Components } from 'react-markdown'

// Lazy load react-markdown
const ReactMarkdown = lazy(() => import('react-markdown').then(m => ({ default: m.default })))

interface MarkdownRendererProps {
  content: string
  className?: string
}

const markdownComponents: Components = {
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-6 my-3 space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-6 my-3 space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="pl-2" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }) => (
    <p className="my-2 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  h1: ({ children, ...props }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-xl font-semibold mt-5 mb-3" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2" {...props}>
      {children}
    </h3>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  code: ({ children, ...props }) => (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-muted pl-4 my-4 italic" {...props}>
      {children}
    </blockquote>
  ),
}

const MarkdownLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
)

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <Suspense fallback={<MarkdownLoader />}>
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </Suspense>
    </div>
  )
}

