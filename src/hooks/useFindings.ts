import { useEffect, useState, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import type { Finding, FindingDisposition } from '@/types/database'

export function useFindings(auditId: string | undefined) {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auditId) return

    async function load() {
      const { data, error } = await insforge.database
        .from('findings')
        .select('*')
        .eq('audit_id', auditId)
        .order('created_at', { ascending: true })

      if (!error && data) setFindings(data as Finding[])
      setLoading(false)
    }

    load()

    const channel = `audit:${auditId}`

    async function subscribe() {
      await insforge.realtime.connect()
      await insforge.realtime.subscribe(channel)
    }

    const handleNewFinding = (payload: Record<string, unknown>) => {
      const finding = payload as unknown as Finding
      if (finding.audit_id === auditId) {
        setFindings(prev => {
          if (prev.some(f => f.id === finding.id)) return prev
          return [...prev, finding]
        })
      }
    }

    insforge.realtime.on('new_finding', handleNewFinding)
    subscribe()

    return () => {
      insforge.realtime.off('new_finding', handleNewFinding)
      insforge.realtime.unsubscribe(channel)
    }
  }, [auditId])

  const updateDisposition = useCallback(async (findingId: string, disposition: FindingDisposition, comment?: string) => {
    const update: Record<string, unknown> = { disposition }
    if (comment !== undefined) update.user_comment = comment

    const { error } = await insforge.database
      .from('findings')
      .update(update)
      .eq('id', findingId)

    if (!error) {
      setFindings(prev =>
        prev.map(f => f.id === findingId ? { ...f, disposition, user_comment: comment ?? f.user_comment } : f)
      )
    }
  }, [])

  return { findings, loading, updateDisposition }
}
