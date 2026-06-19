import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TextPasteInputProps {
  onTextReady: (text: string, name: string) => void
  disabled?: boolean
}

export function TextPasteInput({ onTextReady, disabled }: TextPasteInputProps) {
  const [text, setText] = useState('')
  const [name, setName] = useState('')

  function handleTextChange(value: string) {
    setText(value)
    if (value.trim()) onTextReady(value, name || 'Untitled')
  }

  function handleNameChange(value: string) {
    setName(value)
    if (text.trim()) onTextReady(text, value || 'Untitled')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="doc-name">Document name</Label>
        <Input
          id="doc-name"
          placeholder="e.g. Cover Letter Draft"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paste-text">Paste your text</Label>
        <Textarea
          id="paste-text"
          placeholder="Paste or type the text you want audited..."
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={12}
          className="resize-y font-mono text-sm"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          {text.length > 0 ? `${text.split(/\s+/).filter(Boolean).length} words` : 'No text entered'}
        </p>
      </div>
    </div>
  )
}
