import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUpload } from '@/hooks/useUpload'
import { useAudit } from '@/hooks/useAudit'
import { FileUploader } from '@/components/audit/FileUploader'
import { TextPasteInput } from '@/components/audit/TextPasteInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import type { Asset, Workflow } from '@/types/database'
import { FileText, Clipboard, Loader2 } from 'lucide-react'

export default function NewAuditPage() {
  const navigate = useNavigate()
  const { uploadFile, uploadText, uploading, progress, error: uploadError } = useUpload()
  const { createAudit, fetchWorkflows, fetchChecks, creating } = useAudit()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState<{ text: string; name: string } | null>(null)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('default')
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file')
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchWorkflows().then(setWorkflows)
    fetchChecks()
  }, [])

  async function handleStartAudit() {
    let asset: Asset | null = null

    if (inputMode === 'file' && selectedFile) {
      asset = await uploadFile(selectedFile)
    } else if (inputMode === 'paste' && pastedText) {
      asset = await uploadText(pastedText.text, pastedText.name)
    }

    if (!asset) {
      toast.error(uploadError || 'Failed to upload file')
      return
    }

    const workflow = selectedWorkflowId !== 'default'
      ? workflows.find((w) => w.id === selectedWorkflowId) ?? null
      : null

    const audit = await createAudit(asset, { workflow })

    if (audit) {
      navigate(`/audit/${audit.id}/review`)
    } else {
      toast.error('Failed to create audit')
    }
  }

  const canStart = !uploading && !creating && (
    (inputMode === 'file' && selectedFile !== null) ||
    (inputMode === 'paste' && pastedText !== null && pastedText.text.trim().length > 0)
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Audit</h1>
        <p className="text-muted-foreground">Upload a document or recording to get a detailed audit.</p>
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
              <FileUploader
                onFileSelect={setSelectedFile}
                disabled={uploading || creating}
              />
            </TabsContent>
            <TabsContent value="paste">
              <TextPasteInput
                onTextReady={(text, name) => setPastedText({ text, name })}
                disabled={uploading || creating}
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
          <div className="space-y-2">
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
            <p className="text-xs text-muted-foreground">
              The default audit runs all applicable checks for your input type.
            </p>
          </div>
        </CardContent>
      </Card>

      {(uploading || creating) && (
        <div className="space-y-2">
          <Progress value={creating ? 90 : progress} />
          <p className="text-center text-sm text-muted-foreground">
            {uploading ? 'Uploading file...' : 'Starting audit...'}
          </p>
        </div>
      )}

      <Button
        onClick={handleStartAudit}
        disabled={!canStart}
        size="lg"
        className="w-full"
      >
        {(uploading || creating) ? (
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
