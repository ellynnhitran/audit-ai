import { useMemo, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Finding } from '@/types/database'

interface DocumentViewerProps {
  text: string
  findings: Finding[]
  activeFindingId?: string
  onFindingClick?: (finding: Finding) => void
}

interface TextSegment {
  text: string
  start: number
  end: number
  findings: Finding[]
}

export function DocumentViewer({ text, findings, activeFindingId, onFindingClick }: DocumentViewerProps) {
  const activeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (activeFindingId && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeFindingId])

  const segments = useMemo(() => {
    const textFindings = findings.filter(
      f => f.location?.type === 'text' && typeof f.location.start_offset === 'number'
    )

    if (textFindings.length === 0) {
      return [{ text, start: 0, end: text.length, findings: [] }]
    }

    const breakpoints = new Set<number>([0, text.length])
    for (const f of textFindings) {
      breakpoints.add(f.location.start_offset!)
      breakpoints.add(f.location.end_offset!)
    }

    const sorted = Array.from(breakpoints).sort((a, b) => a - b)
    const result: TextSegment[] = []

    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i]
      const end = sorted[i + 1]
      const segFindings = textFindings.filter(
        f => f.location.start_offset! <= start && f.location.end_offset! >= end
      )
      result.push({
        text: text.slice(start, end),
        start,
        end,
        findings: segFindings,
      })
    }

    return result
  }, [text, findings])

  return (
    <ScrollArea className="h-full">
      <div className="p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, i) => {
          if (seg.findings.length === 0) {
            return <span key={i}>{seg.text}</span>
          }

          const topFinding = seg.findings.sort((a, b) => {
            const order = { major: 0, minor: 1, info: 2 }
            return order[a.severity] - order[b.severity]
          })[0]

          const isActive = seg.findings.some(f => f.id === activeFindingId)

          return (
            <span
              key={i}
              ref={isActive ? activeRef : undefined}
              className={cn(
                'cursor-pointer rounded-sm transition-all',
                topFinding.severity === 'major' && 'bg-red-200/60 dark:bg-red-900/40',
                topFinding.severity === 'minor' && 'bg-yellow-200/60 dark:bg-yellow-900/40',
                topFinding.severity === 'info' && 'bg-blue-200/60 dark:bg-blue-900/40',
                isActive && 'ring-2 ring-primary ring-offset-1',
              )}
              onClick={() => onFindingClick?.(topFinding)}
              title={topFinding.title}
            >
              {seg.text}
            </span>
          )
        })}
      </div>
    </ScrollArea>
  )
}
