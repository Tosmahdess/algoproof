import CodeSnippet from '@/components/CodeSnippet'
import type { TechnicalSection } from '@/lib/bot-params'

export default function TechnicalArticle({ sections }: { sections: TechnicalSection[] }) {
  return (
    <div className="space-y-7">
      {sections.map((section, i) => (
        <div key={i}>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60 mb-2">
            {section.title}
          </h3>
          <p className="text-sm leading-relaxed text-foreground/80">
            {section.body}
          </p>
          {section.code && <CodeSnippet code={section.code} />}
        </div>
      ))}
    </div>
  )
}
