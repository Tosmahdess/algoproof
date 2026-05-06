import { ReactNode } from 'react'

interface ExplainerBoxProps {
  functional: ReactNode  // Plain-language explanation, shown first
  technical:  ReactNode  // Technical detail for devs, shown second
}

export default function ExplainerBox({ functional, technical }: ExplainerBoxProps) {
  return (
    <div className="rounded border border-border overflow-hidden">
      <div data-section="functional" className="px-6 py-5">
        <p className="mb-2 text-[10px] font-semibold tracking-widest uppercase text-muted">
          En bref
        </p>
        <div className="text-sm leading-relaxed">{functional}</div>
      </div>

      <div
        data-section="technical"
        className="border-t border-border bg-card px-6 py-5"
      >
        <p className="mb-3 text-[10px] font-semibold tracking-widest uppercase text-muted">
          Détails techniques
        </p>
        <div className="text-sm">{technical}</div>
      </div>
    </div>
  )
}
