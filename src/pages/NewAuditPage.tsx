import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAudit } from '@/hooks/useAudit'
import { insforge } from '@/lib/insforge'
import { extractText } from '@/lib/parse'
import { runAllChecks } from '@/lib/checks'
import { FileUploader } from '@/components/audit/FileUploader'
import { TextPasteInput } from '@/components/audit/TextPasteInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { Workflow, Finding, SummaryMetrics } from '@/types/database'
import { FileText, Clipboard, Loader2 } from 'lucide-react'

export default function NewAuditPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchWorkflows } = useAudit()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState<{ text: string; name: string } | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('default')
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file')
  const [processing, setProcessing] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchWorkflows().then(setWorkflows)
  }, [])

  async function handleStartAudit() {
    if (!user) return
    setProcessing(true)

    try {
      let text: string
      let fileName: string

      if (inputMode === 'file' && selectedFile) {
        text = await extractText(selectedFile)
        fileName = selectedFile.name
      } else if (inputMode === 'paste' && pastedText?.text.trim()) {
        text = pastedText.text
        fileName = pastedText.name || 'Untitled'
      } else {
        toast.error('No content to audit')
        setProcessing(false)
        return
      }

      if (!text.trim()) {
        toast.error('Could not extract text from the file')
        setProcessing(false)
        return
      }

      // Run checks instantly client-side
      const findings = runAllChecks(text)

      const bySeverity = { info: 0, minor: 0, major: 0 }
      const byCategory: Record<string, number> = {}
      for (const f of findings) {
        bySeverity[f.severity]++
        byCategory[f.category] = (byCategory[f.category] || 0) + 1
      }
      const summaryMetrics: SummaryMetrics = {
        total_findings: findings.length,
        by_severity: bySeverity,
        by_category: byCategory,
      }

      // Navigate to review immediately with results
      navigate('/audit/local/review', {
        state: { text, fileName, findings, summaryMetrics },
      })

      // Save to DB in background (fire-and-forget)
      saveToDb(user.id, fileName, text, findings, summaryMetrics, selectedFile)

    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process')
      setProcessing(false)
    }
  }

  const canStart = !processing && (
    (inputMode === 'file' && selectedFile !== null) ||
    (inputMode === 'paste' && pastedText !== null && pastedText.text.trim().length > 0)
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Audit</h1>
        <p className="text-muted-foreground">Upload a document or paste text to get a detailed audit.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
          <CardDescription>Choose how to provide your content</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'file' | 'paste')}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="file" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex-1 gap-2">
                <Clipboard className="h-4 w-4" />
                Paste Text
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <FileUploader onFileSelect={setSelectedFile} disabled={processing} />
            </TabsContent>
            <TabsContent value="paste">
              <TextPasteInput
                onTextReady={(text, name) => setPastedText({ text, name })}
                disabled={processing}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Configuration</CardTitle>
          <CardDescription>Choose which checks to run</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a workflow" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Audit (all checks)</SelectItem>
              {workflows.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            The default audit runs all applicable checks for your document.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleStartAudit} disabled={!canStart} size="lg" className="w-full">
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Start Audit'
        )}
      </Button>
    </div>
  )
}

async function saveToDb(
  userId: string,
  fileName: string,
  text: string,
  findings: Finding[],
  summaryMetrics: SummaryMetrics,
  file: File | null,
) {
  try {
    const assetId = crypto.randomUUID()

    if (file) {
      await insforge.storage
        .from('documents')
        .upload(`${userId}/${assetId}/${file.name}`, file)
    }

    const { data: asset } = await insforge.database
      .from('assets')
      .insert([{
        id: assetId,
        user_id: userId,
        name: fileName,
        type: 'document',
        mime_type: file?.type || 'text/plain',
        file_size: file?.size || new Blob([text]).size,
        storage_key: file ? `${userId}/${assetId}/${file.name}` : `${userId}/${assetId}/${fileName}.txt`,
        storage_url: '',
        status: 'ready',
        extracted_text: text,
        metadata: { word_count: text.split(/\s+/).filter(Boolean).length },
      }])
      .select()
      .single()

    if (!asset) return

    const { data: audit } = await insforge.database
      .from('audits')
      .insert([{
        user_id: userId,
        asset_id: asset.id,
        status: 'completed',
        check_order: ['spelling', 'grammar', 'readability', 'formatting'],
        summary_metrics: summaryMetrics,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (!audit || findings.length === 0) return

    await insforge.database.from('findings').insert(
      findings.map(f => ({
        audit_id: audit.id,
        check_id: f.check_id,
        category: f.category,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        location: f.location,
        suggested_fix: f.suggested_fix,
        original_text: f.original_text,
        disposition: 'pending',
      }))
    )
  } catch {
    // Background save failed silently — user already sees results
  }
}
