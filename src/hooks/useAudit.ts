import { useState } from 'react'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/hooks/useAuth'
import type { Asset, Audit, Check, Workflow } from '@/types/database'

export function useAudit() {
  const { user } = useAuth()
  const [creating, setCreating] = useState(false)

  async function createAudit(
    asset: Asset,
    options: {
      workflow?: Workflow | null
      checkOrder?: string[]
      customInstructions?: string
    } = {}
  ): Promise<Audit | null> {
    if (!user) return null
    setCreating(true)

    try {
      const checkOrder = options.workflow?.check_order ?? options.checkOrder ?? []
      const customInstructions = options.workflow?.custom_instructions ?? options.customInstructions ?? null

      const { data: audit, error } = await insforge.database
        .from('audits')
        .insert([{
          user_id: user.id,
          asset_id: asset.id,
          workflow_id: options.workflow?.id ?? null,
          status: 'pending',
          check_order: checkOrder,
          custom_instructions: customInstructions,
        }])
        .select()
        .single()

      if (error) throw new Error(error.message)

      const { error: fnError } = await insforge.functions.invoke('audit-orchestrator', {
        body: { audit_id: audit.id },
      })

      if (fnError) {
        console.error('Function invoke error:', fnError)
      }

      return audit
    } catch (err) {
      console.error('Create audit error:', err)
      return null
    } finally {
      setCreating(false)
    }
  }

  async function fetchAudit(auditId: string) {
    const { data, error } = await insforge.database
      .from('audits')
      .select('*, assets(*)')
      .eq('id', auditId)
      .single()

    if (error) return null
    return data as Audit
  }

  async function fetchUserAudits(limit = 20) {
    if (!user) return []
    const { data, error } = await insforge.database
      .from('audits')
      .select('*, assets(name, type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return data as Audit[]
  }

  async function fetchChecks() {
    const { data, error } = await insforge.database
      .from('checks')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) return []
    return data as Check[]
  }

  async function fetchWorkflows() {
    if (!user) return []
    const { data, error } = await insforge.database
      .from('workflows')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return []
    return data as Workflow[]
  }

  return { createAudit, fetchAudit, fetchUserAudits, fetchChecks, fetchWorkflows, creating }
}
