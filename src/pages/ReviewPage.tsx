import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { useAudit } from '@/hooks/useAudit'
import { useFindings } from '@/hooks/useFindings'
import { DocumentViewer } from '@/components/review/DocumentViewer'
import { FindingsList } from '@/components/review/FindingsList'
import { ExportButton } from '@/components/report/ExportButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { Audit, Asset, AuditStatus, Finding } from '@/types/database'

const statusConfig: Record<AuditStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export default function ReviewPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const { fetchAudit } = useAudit()
  const { findings, loading: findingsLoading, updateDisposition } = useFindings(auditId)

  const [audit, setAudit] = useState<Audit | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFindingId, setActiveFindingId] = useState<string | undefined>()

  useEffect(() => {
    if (!auditId) return

    async function load() {
      const data = await fetchAudit(auditId!)
      if (data) {
        setAudit(data)
        setAsset(data.assets as unknown as Asset)
      }
      setLoading(false)
    }

    load()

    const interval = setInterval(async () => {
      const data = await fetchAudit(auditId!)
      if (data) {
        setAudit(data)
        if (data.assets) setAsset(data.assets as unknown as Asset)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
        }
      }
    }, 2000)

    return () => { clearInterval(interval) }
  }, [auditId])

  function handleFindingClick(finding: Finding) {
    setActiveFindingId(finding.id)
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!audit || !asset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Audit not found.</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const status = statusConfig[audit.status]

  if (audit.status === 'pending' || audit.status === 'processing') {
    return (
      <div className="mx-auto max-w-md space-y-6 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Auditing your document...</h2>
          <p className="mt-1 text-muted-foreground">Parsing and analyzing. This should only take a moment.</p>
        </div>
        <Progress value={audit.status === 'processing' ? 60 : 20} />
        <Badge variant={status.variant}>{status.label}</Badge>
        {findingsLoading ? null : findings.length > 0 && (
          <p className="text-sm text-muted-foreground">{findings.length} findings so far...</p>
        )}
      </div>
    )
  }

  if (audit.status === 'failed') {
    return (
      <div className="mx-auto max-w-md space-y-4 py-20 text-center">
        <h2 className="text-xl font-semibold text-destructive">Audit Failed</h2>
        <p className="text-muted-foreground">{audit.error_message || 'An unknown error occurred.'}</p>
        <Link to="/audit/new">
          <Button>Try Again</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col -m-6">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-sm font-semibold">{asset.name}</h2>
            <p className="text-xs text-muted-foreground">
              {audit.summary_metrics.total_findings ?? findings.length} findings
            </p>
          </div>
        </div>
        <ExportButton audit={audit} asset={asset} findings={findings} />
      </div>

      <Group orientation="horizontal" className="flex-1">
        <Panel defaultSize={60} minSize={30}>
          <DocumentViewer
            text={asset.extracted_text || ''}
            findings={findings}
            activeFindingId={activeFindingId}
            onFindingClick={handleFindingClick}
          />
        </Panel>
        <Separator />
        <Panel defaultSize={40} minSize={25}>
          <FindingsList
            findings={findings}
            onUpdateDisposition={updateDisposition}
            activeFindingId={activeFindingId}
            onFindingClick={handleFindingClick}
          />
        </Panel>
      </Group>
    </div>
  )
}
