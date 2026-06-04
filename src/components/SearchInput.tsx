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
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {value && (
          <button
            type="button"
            aria-label="Effacer la recherche"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
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
