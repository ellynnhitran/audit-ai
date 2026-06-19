import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FindingCard } from './FindingCard'
import type { Finding, FindingDisposition, FindingSeverity } from '@/types/database'

interface FindingsListProps {
  findings: Finding[]
  onUpdateDisposition: (id: string, disposition: FindingDisposition, comment?: string) => void
  activeFindingId?: string
  onFindingClick?: (finding: Finding) => void
}

export function FindingsList({ findings, onUpdateDisposition, activeFindingId, onFindingClick }: FindingsListProps) {
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categories = useMemo(() => {
    const cats = new Set(findings.map(f => f.category))
    return Array.from(cats).sort()
  }, [findings])

  const filtered = useMemo(() => {
    return findings.filter(f => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false
      return true
    })
  }, [findings, severityFilter, categoryFilter])

  const counts = useMemo(() => ({
    total: findings.length,
    major: findings.filter(f => f.severity === 'major').length,
    minor: findings.filter(f => f.severity === 'minor').length,
    info: findings.filter(f => f.severity === 'info').length,
  }), [findings])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold">Findings</h3>
          <Badge variant="secondary" className="text-xs">{counts.total}</Badge>
        </div>
        <div className="flex gap-1 text-xs">
          {counts.major > 0 && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{counts.major} major</Badge>
          )}
          {counts.minor > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{counts.minor} minor</Badge>
          )}
          {counts.info > 0 && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{counts.info} info</Badge>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as FindingSeverity | 'all')}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="major">Major</SelectItem>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {findings.length === 0 ? 'No findings yet' : 'No findings match filters'}
            </p>
          ) : (
            filtered.map(finding => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onUpdateDisposition={onUpdateDisposition}
                isActive={finding.id === activeFindingId}
                onClick={() => onFindingClick?.(finding)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
