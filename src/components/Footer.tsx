export default function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-muted">
        <span>AlgoProof — Every trade, every loss, on record.</span>
        <div className="flex gap-6">
          <a href="https://x.com/AlgoProof" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">X / Twitter</a>
          <a href="https://discord.gg/placeholder"  target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Discord</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-4 text-xs text-muted/50">
        Not financial advice. All performance data is paper trading unless marked Live.
      </div>
    </footer>
  )
}
