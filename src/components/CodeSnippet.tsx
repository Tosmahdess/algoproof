'use client'

import { useState } from 'react'

function highlight(raw: string): string {
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    // comments — must run before other rules
    .replace(/(#[^\n]*)/g, '<span style="color:#8b949e">$1</span>')
    // single-quoted strings
    .replace(/('(?:[^'\\]|\\.)*')/g, '<span style="color:#a5d6ff">$1</span>')
    // double-quoted strings
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#a5d6ff">$1</span>')
    // keywords
    .replace(
      /\b(def|if|else|elif|return|and|or|not|in|for|while|import|from|True|False|None)\b/g,
      '<span style="color:#ff7b72">$1</span>'
    )
    // numbers
    .replace(/\b(\d+)\b/g, '<span style="color:#f2cc60">$1</span>')
}

interface CodeSnippetProps {
  code: string
}

export default function CodeSnippet({ code }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-6">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted/60 mb-2">
        Logique signal
      </p>
      <div className="relative">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 z-10 text-[10px] px-2 py-0.5 rounded bg-card border border-border text-muted hover:text-foreground transition-colors"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
        <pre
          className="overflow-x-auto rounded bg-[#0d1117] border border-[#21262d] px-4 py-4 text-xs font-mono leading-relaxed text-[#79c0ff] whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlight(code) }}
        />
      </div>
    </div>
  )
}
