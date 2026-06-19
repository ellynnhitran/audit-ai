import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Check, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import type { Finding, FindingDisposition } from '@/types/database'

const severityConfig = {
  info: { label: 'Info', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  minor: { label: 'Minor', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  major: { label: 'Major', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
}

interface FindingCardProps {
  finding: Finding
  onUpdateDisposition: (id: string, disposition: FindingDisposition, comment?: string) => void
  isActive?: boolean
  onClick?: () => void
}

export function FindingCard({ finding, onUpdateDisposition, isActive, onClick }: FindingCardProps) {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState(finding.user_comment ?? '')
  const [expanded, setExpanded] = useState(false)

  const severity = severityConfig[finding.severity]
  const isDismissed = finding.disposition === 'dismissed'
  const isAccepted = finding.disposition === 'accepted'

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all cursor-pointer',
        isActive && 'ring-2 ring-primary',
        isDismissed && 'opacity-50',
        isAccepted && 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <Badge className={cn('shrink-0 text-xs', severity.className)}>
          {severity.label}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{finding.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{finding.category}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-muted-foreground">{finding.explanation}</p>

          {finding.original_text && (
            <div className="rounded bg-muted px-2 py-1">
              <p className="text-xs font-mono text-muted-foreground">{finding.original_text}</p>
            </div>
          )}

          {finding.suggested_fix && (
            <div className="rounded bg-green-50 px-2 py-1 dark:bg-green-950">
              <p className="text-xs">
                <span className="font-medium">Suggestion: </span>
                {finding.suggested_fix}
              </p>
            </div>
          )}

          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant={isAccepted ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => onUpdateDisposition(finding.id, 'accepted')}
            >
              <Check className="mr-1 h-3 w-3" />
              Accept
            </Button>
            <Button
              size="sm"
              variant={isDismissed ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => onUpdateDisposition(finding.id, 'dismissed')}
            >
              <X className="mr-1 h-3 w-3" />
              Dismiss
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowComment(!showComment)}
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              Comment
            </Button>
          </div>

          {showComment && (
            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="text-xs"
                placeholder="Add a comment..."
              />
              <Button
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  onUpdateDisposition(finding.id, finding.disposition, comment)
                  setShowComment(false)
                }}
              >
                Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
