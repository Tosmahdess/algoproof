'use client'
import React from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  resultCount?: number
  totalCount?: number
}

export default function SearchInput({ value, onChange, placeholder = 'Rechercher une société…', resultCount, totalCount }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 rounded-md border border-border bg-card pl-3 pr-12 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {value && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => onChange('')}
            className="absolute min-h-10 min-w-10 right-0 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>
      {value && resultCount !== undefined && totalCount !== undefined && (
        <span className="text-xs font-mono text-muted">{resultCount} / {totalCount}</span>
      )}
    </div>
  )
}
