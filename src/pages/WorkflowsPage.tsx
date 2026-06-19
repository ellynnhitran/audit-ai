import { useState } from 'react'
import { useWorkflow } from '@/hooks/useWorkflow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, GripVertical, X, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Check, InputType, Workflow } from '@/types/database'

function WorkflowBuilder({
  checks,
  initialWorkflow,
  onSave,
  onCancel,
}: {
  checks: Check[]
  initialWorkflow?: Workflow
  onSave: (data: { id?: string; name: string; description?: string; input_type: InputType; check_order: string[]; custom_instructions?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initialWorkflow?.name ?? '')
  const [description, setDescription] = useState(initialWorkflow?.description ?? '')
  const [inputType, setInputType] = useState<InputType>(initialWorkflow?.input_type ?? 'any')
  const [selectedChecks, setSelectedChecks] = useState<string[]>(initialWorkflow?.check_order ?? [])
  const [customInstructions, setCustomInstructions] = useState(initialWorkflow?.custom_instructions ?? '')
  const [saving, setSaving] = useState(false)

  const availableChecks = checks.filter(c =>
    (inputType === 'any' || c.applicable_input === 'any' || c.applicable_input === inputType) &&
    !selectedChecks.includes(c.id)
  )

  function addCheck(checkId: string) {
    setSelectedChecks(prev => [...prev, checkId])
  }

  function removeCheck(checkId: string) {
    setSelectedChecks(prev => prev.filter(id => id !== checkId))
  }

  function moveCheck(index: number, direction: -1 | 1) {
    const newOrder = [...selectedChecks]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]]
    setSelectedChecks(newOrder)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Workflow name is required'); return }
    if (selectedChecks.length === 0) { toast.error('Add at least one check'); return }

    setSaving(true)
    await onSave({
      id: initialWorkflow?.id,
      name: name.trim(),
      description: description.trim() || undefined,
      input_type: inputType,
      check_order: selectedChecks,
      custom_instructions: customInstructions.trim() || undefined,
    })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Workflow Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Blog Post Audit" />
        </div>
        <div className="space-y-2">
          <Label>Input Type</Label>
          <Select value={inputType} onValueChange={v => setInputType(v as InputType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any (Document or Audio)</SelectItem>
              <SelectItem value="document">Document only</SelectItem>
              <SelectItem value="audio">Audio only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this workflow is for..." />
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-medium">Available Checks</h4>
          <div className="space-y-1 rounded-lg border p-2">
            {availableChecks.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">All checks added</p>
            ) : (
              availableChecks.map(check => (
                <button
                  key={check.id}
                  onClick={() => addCheck(check.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{check.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{check.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">{check.category}</Badge>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Selected Checks ({selectedChecks.length})</h4>
          <div className="space-y-1 rounded-lg border p-2">
            {selectedChecks.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Click checks on the left to add them</p>
            ) : (
              selectedChecks.map((checkId, index) => {
                const check = checks.find(c => c.id === checkId)
                if (!check) return null
                return (
                  <div
                    key={checkId}
                    className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveCheck(index, -1)}
                        disabled={index === 0}
                        className={cn('text-xs', index === 0 && 'opacity-30')}
                      >
                        <GripVertical className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                    <span className="flex-1 text-sm">{check.name}</span>
                    <button onClick={() => removeCheck(checkId)}>
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Custom Instructions (optional)</Label>
        <Textarea
          value={customInstructions}
          onChange={e => setCustomInstructions(e.target.value)}
          placeholder="Add plain-English instructions that will be evaluated by AI. e.g., 'Ensure every piece ends with a call to action' or 'Check that no passive voice is used'"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          These instructions are passed to the AI engine as an additional check.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : initialWorkflow ? 'Update Workflow' : 'Create Workflow'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

export default function WorkflowsPage() {
  const { workflows, checks, loading, saveWorkflow, deleteWorkflow } = useWorkflow()
  const [isBuilding, setIsBuilding] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>()

  async function handleSave(data: { id?: string; name: string; description?: string; input_type: InputType; check_order: string[]; custom_instructions?: string }) {
    const result = await saveWorkflow(data)
    if (result) {
      toast.success(data.id ? 'Workflow updated' : 'Workflow created')
      setIsBuilding(false)
      setEditingWorkflow(undefined)
    } else {
      toast.error('Failed to save workflow')
    }
  }

  async function handleDelete(id: string) {
    await deleteWorkflow(id)
    toast.success('Workflow deleted')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isBuilding || editingWorkflow) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {editingWorkflow ? 'Edit Workflow' : 'New Workflow'}
        </h1>
        <WorkflowBuilder
          checks={checks}
          initialWorkflow={editingWorkflow}
          onSave={handleSave}
          onCancel={() => { setIsBuilding(false); setEditingWorkflow(undefined) }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">Create reusable audit configurations.</p>
        </div>
        <Button onClick={() => setIsBuilding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">No custom workflows yet.</p>
            <Button variant="outline" onClick={() => setIsBuilding(true)}>
              Create your first workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {workflows.map(workflow => (
            <Card key={workflow.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{workflow.name}</CardTitle>
                    {workflow.description && (
                      <CardDescription className="mt-1">{workflow.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">{workflow.input_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-3">
                  {workflow.check_order.map(checkId => {
                    const check = checks.find(c => c.id === checkId)
                    return (
                      <Badge key={checkId} variant="secondary" className="text-xs">
                        {check?.name ?? checkId}
                      </Badge>
                    )
                  })}
                </div>
                {workflow.custom_instructions && (
                  <p className="mb-3 text-xs text-muted-foreground italic truncate">
                    Custom: {workflow.custom_instructions}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingWorkflow(workflow)}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="text-destructive">
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete "{workflow.name}"?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone. Existing audits using this workflow will not be affected.
                      </p>
                      <div className="flex justify-end gap-2">
                        <Button variant="destructive" onClick={() => handleDelete(workflow.id)}>
                          Delete
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
