import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface MultiSelectOption {
  id: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  loading?: boolean
  onOpen?: () => void | Promise<void>
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  className,
  loading = false,
  onOpen,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleOption = (optionId: string) => {
    if (disabled) return
    
    const newValue = value.includes(optionId)
      ? value.filter(id => id !== optionId)
      : [...value, optionId]
    
    onChange(newValue)
  }

  const selectedLabels = options
    .filter(opt => value.includes(opt.id))
    .map(opt => opt.label)

  const handleToggle = async () => {
    if (disabled) return
    
    const willOpen = !isOpen
    
    // Fetch data on first open if onOpen callback is provided
    if (willOpen && !hasOpened && onOpen) {
      setHasOpened(true)
      try {
        await onOpen()
      } catch (error) {
        console.error('Error loading options:', error)
        // Still open dropdown even if fetch fails
      }
    }
    
    setIsOpen(willOpen)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full h-12 px-4 py-3 text-left border border-gray-300 rounded-lg bg-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'hover:border-gray-400 transition-all',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300',
          'flex items-center justify-between gap-2',
          className
        )}
      >
        <span className={cn(
          'flex-1 text-sm md:text-base truncate',
          selectedLabels.length === 0 ? 'text-muted-foreground' : 'text-foreground'
        )}>
          {loading
            ? 'Đang tải...'
            : selectedLabels.length === 0
            ? placeholder
            : selectedLabels.length === 1
            ? selectedLabels[0]
            : `${selectedLabels.length} selected`}
        </span>
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
        ) : (
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
            className={cn(
              'transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-input rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
              <span>Đang tải dữ liệu...</span>
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No options available
            </div>
          ) : (
            <div className="p-1">
              {options.map((option) => {
                const isSelected = value.includes(option.id)
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition-colors',
                      isSelected && 'bg-muted'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(option.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-foreground flex-1">{option.label}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

