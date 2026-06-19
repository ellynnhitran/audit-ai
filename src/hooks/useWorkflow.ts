import { useState, useEffect, useRef } from 'react'
import { insforge } from '@/lib/insforge'
import { useAuth } from '@/hooks/useAuth'
import type { Workflow, Check, InputType } from '@/types/database'

export function useWorkflow() {
  const { user } = useAuth()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [checks, setChecks] = useState<Check[]>([])
  const [loading, setLoading] = useState(true)
  const loaded = useRef(false)

  useEffect(() => {
    if (!user || loaded.current) return
    loaded.current = true

    async function load() {
      const [workflowsRes, checksRes] = await Promise.all([
        insforge.database
          .from('workflows')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        insforge.database
          .from('checks')
          .select('*')
          .order('display_order', { ascending: true }),
      ])

      if (workflowsRes.data) setWorkflows(workflowsRes.data as Workflow[])
      if (checksRes.data) setChecks(checksRes.data as Check[])
      setLoading(false)
    }

    load()
  }, [user])

  async function saveWorkflow(data: {
    id?: string
    name: string
    description?: string
    input_type: InputType
    check_order: string[]
    custom_instructions?: string
  }): Promise<Workflow | null> {
    if (!user) return null

    if (data.id) {
      const { data: updated, error } = await insforge.database
        .from('workflows')
        .update({
          name: data.name,
          description: data.description ?? null,
          input_type: data.input_type,
          check_order: data.check_order,
          custom_instructions: data.custom_instructions ?? null,
        })
        .eq('id', data.id)
        .select()
        .single()

      if (error) return null
      setWorkflows(prev => prev.map(w => w.id === data.id ? (updated as Workflow) : w))
      return updated as Workflow
    }

    const { data: created, error } = await insforge.database
      .from('workflows')
      .insert([{
        user_id: user.id,
        name: data.name,
        description: data.description ?? null,
        input_type: data.input_type,
        check_order: data.check_order,
        custom_instructions: data.custom_instructions ?? null,
      }])
      .select()
      .single()

    if (error) return null
    setWorkflows(prev => [created as Workflow, ...prev])
    return created as Workflow
  }

  async function deleteWorkflow(id: string) {
    const { error } = await insforge.database.from('workflows').delete().eq('id', id)
    if (!error) setWorkflows(prev => prev.filter(w => w.id !== id))
  }

  return { workflows, checks, loading, saveWorkflow, deleteWorkflow }
}
