import { useState } from 'react'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/hooks/useAuth'

const DOCUMENT_TYPES = ['text/plain', 'text/markdown', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const DOCUMENT_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx']

const MAX_FILE_SIZE = 50 * 1024 * 1024

export function isValidDocument(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return DOCUMENT_TYPES.includes(file.type) || DOCUMENT_EXTENSIONS.includes(ext)
}

export function getAcceptString() {
  return DOCUMENT_EXTENSIONS.join(',')
}

export function useUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    if (!user) { setError('Not authenticated'); return null }
    if (!isValidDocument(file)) { setError('Unsupported file type. Use .txt, .md, .pdf, or .docx'); return null }
    if (file.size > MAX_FILE_SIZE) { setError('File exceeds 50MB limit'); return null }

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      const assetId = crypto.randomUUID()
      const storagePath = `${user.id}/${assetId}/${file.name}`

      setProgress(20)

      const { data: storageData, error: storageError } = await insforge.storage
        .from('documents')
        .upload(storagePath, file)

      if (storageError || !storageData) throw new Error(storageError?.message ?? 'Upload failed')
      setProgress(60)

      const { data: asset, error: dbError } = await insforge.database
        .from('assets')
        .insert([{
          id: assetId,
          user_id: user.id,
          name: file.name,
          type: 'document',
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          storage_key: storageData.key,
          storage_url: storageData.url,
          status: 'uploaded',
        }])
        .select()
        .single()

      if (dbError) throw new Error(dbError.message)
      setProgress(100)

      return asset
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function uploadText(text: string, name: string) {
    const file = new File([text], name.endsWith('.txt') ? name : `${name}.txt`, {
      type: 'text/plain',
    })
    return uploadFile(file)
  }

  return { uploadFile, uploadText, uploading, progress, error }
}
