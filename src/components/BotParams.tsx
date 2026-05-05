import type { BotParams } from '@/lib/bot-params'

export default function BotParams({ params }: { params: BotParams }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-8">
      <h2 className="font-semibold mb-5">Parameters</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {params.groups.map(group => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60 mb-3">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.items.map(item => (
                <div key={item.label} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted shrink-0">{item.label}</span>
                  <div className="text-right">
                    <span className="font-mono font-medium">{item.value}</span>
                    {item.note && (
                      <span className="block text-xs text-muted/60 mt-0.5">{item.note}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
