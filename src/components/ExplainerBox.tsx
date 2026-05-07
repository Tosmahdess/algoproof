'use client'

import { useState, ReactNode } from 'react'

interface ExplainerBoxProps {
  functional: ReactNode
  technical:  ReactNode
}

type Tab = 'functional' | 'technical'

export default function ExplainerBox({ functional, technical }: ExplainerBoxProps) {
  const [active, setActive] = useState<Tab>('functional')

  return (
    <div className="rounded border border-border overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-border bg-card">
        <button
          data-tab="functional"
          onClick={() => setActive('functional')}
          className={`px-6 py-3 text-xs font-semibold tracking-widest uppercase border-b-2 -mb-px transition-colors ${
            active === 'functional'
              ? 'text-[#ff6b35] border-[#ff6b35]'
              : 'text-muted border-transparent hover:text-foreground'
          }`}
        >
          📖 Fonctionnel
        </button>
        <button
          data-tab="technical"
          onClick={() => setActive('technical')}
          className={`px-6 py-3 text-xs font-semibold tracking-widest uppercase border-b-2 -mb-px transition-colors ${
            active === 'technical'
              ? 'text-[#ff6b35] border-[#ff6b35]'
              : 'text-muted border-transparent hover:text-foreground'
          }`}
        >
          ⚙️ Technique
        </button>
      </div>

      {/* Active tab content */}
      <div className="px-6 py-5">
        {active === 'functional' ? (
          <div data-section="functional" className="text-sm leading-relaxed">
            {functional}
          </div>
        ) : (
          <div data-section="technical" className="text-sm">
            {technical}
          </div>
        )}
      </div>
    </div>
  )
}
