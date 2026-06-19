import { useCallback, useState, type DragEvent } from 'react'
import { cn } from '@/lib/utils'
import { getAcceptString, isValidDocument } from '@/hooks/useUpload'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function FileUploader({ onFileSelect, disabled }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && isValidDocument(file)) {
      setSelectedFile(file)
      onFileSelect(file)
    }
  }, [onFileSelect])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      onFileSelect(file)
    }
  }

  function clearFile() {
    setSelectedFile(null)
  }

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
        <FileText className="h-8 w-8 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
        {!disabled && (
          <Button variant="ghost" size="icon" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        disabled && 'pointer-events-none opacity-50'
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="mb-1 text-sm font-medium">
        Drag and drop a file here, or click to browse
      </p>
      <p className="text-xs text-muted-foreground">
        Supported: .txt, .md, .docx, .pdf &middot; Max 50MB
      </p>
      <input
        type="file"
        accept={getAcceptString()}
        onChange={handleFileInput}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={disabled}
      />
    </div>
  )
}
