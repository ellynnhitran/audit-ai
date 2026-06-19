import { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { useAudit } from '@/hooks/useAudit'
import { useFindings } from '@/hooks/useFindings'
import { DocumentViewer } from '@/components/review/DocumentViewer'
import { FindingsList } from '@/components/review/FindingsList'
import { ExportButton } from '@/components/report/ExportButton'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import type { Audit, Asset, Finding, FindingDisposition, SummaryMetrics } from '@/types/database'

interface LocalState {
  text: string
  fileName: string
  findings: Finding[]
  summaryMetrics: SummaryMetrics
}

export default function ReviewPage() {
  const { auditId } = useParams<{ auditId: string }>()
  const location = useLocation()
  const localState = location.state as LocalState | undefined

  const isLocal = auditId === 'local' && localState

  if (isLocal) {
    return <LocalReview state={localState} />
  }

  return <DbReview auditId={auditId!} />
}

function LocalReview({ state }: { state: LocalState }) {
  const [findings, setFindings] = useState(state.findings)
  const [activeFindingId, setActiveFindingId] = useState<string | undefined>()

  const updateDisposition = useCallback((findingId: string, disposition: FindingDisposition, comment?: string) => {
    setFindings(prev =>
      prev.map(f => f.id === findingId ? { ...f, disposition, user_comment: comment ?? f.user_comment } : f)
    )
  }, [])

  const localAudit: Audit = {
    id: 'local',
    user_id: '',
    asset_id: '',
    workflow_id: null,
    status: 'completed',
    check_order: ['spelling', 'grammar', 'readability', 'formatting'],
    custom_instructions: null,
    summary_metrics: state.summaryMetrics,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const localAsset: Asset = {
    id: 'local',
    user_id: '',
    name: state.fileName,
    type: 'document',
    mime_type: 'text/plain',
    file_size: state.text.length,
    storage_key: '',
    storage_url: '',
    status: 'ready',
    metadata: {},
    extracted_text: state.text,
    transcript: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return (
    <ReviewLayout
      audit={localAudit}
      asset={localAsset}
      findings={findings}
      activeFindingId={activeFindingId}
      onFindingClick={(f) => setActiveFindingId(f.id)}
      onUpdateDisposition={updateDisposition}
    />
  )
}

function DbReview({ auditId }: { auditId: string }) {
  const { fetchAudit } = useAudit()
  const { findings, updateDisposition } = useFindings(auditId)
  const [audit, setAudit] = useState<Audit | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFindingId, setActiveFindingId] = useState<string | undefined>()

  useEffect(() => {
    fetchAudit(auditId).then(data => {
      if (data) {
        setAudit(data)
        setAsset(data.assets as unknown as Asset)
      }
      setLoading(false)
    })
  }, [auditId])

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
        <Link to="/"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button></Link>
      </div>
    )
  }

  return (
    <ReviewLayout
      audit={audit}
      asset={asset}
      findings={findings}
      activeFindingId={activeFindingId}
      onFindingClick={(f) => setActiveFindingId(f.id)}
      onUpdateDisposition={updateDisposition}
    />
  )
}

function ReviewLayout({
  audit, asset, findings, activeFindingId, onFindingClick, onUpdateDisposition,
}: {
  audit: Audit
  asset: Asset
  findings: Finding[]
  activeFindingId?: string
  onFindingClick: (f: Finding) => void
  onUpdateDisposition: (id: string, disposition: FindingDisposition, comment?: string) => void
}) {
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
            onFindingClick={onFindingClick}
          />
        </Panel>
        <Separator />
        <Panel defaultSize={40} minSize={25}>
          <FindingsList
            findings={findings}
            onUpdateDisposition={onUpdateDisposition}
            activeFindingId={activeFindingId}
            onFindingClick={onFindingClick}
          />
        </Panel>
      </Group>
    </div>
  )
}
