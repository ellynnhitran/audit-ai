export type AssetType = 'document' | 'audio'
export type AssetStatus = 'uploaded' | 'processing' | 'ready' | 'error'
export type InputType = 'document' | 'audio' | 'any'
export type AuditStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type FindingSeverity = 'info' | 'minor' | 'major'
export type FindingDisposition = 'pending' | 'accepted' | 'dismissed'

export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  plan: 'free' | 'pro' | 'team'
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  user_id: string
  name: string
  type: AssetType
  mime_type: string
  file_size: number
  storage_key: string
  storage_url: string
  status: AssetStatus
  metadata: Record<string, unknown>
  extracted_text: string | null
  transcript: TranscriptWord[] | null
  created_at: string
  updated_at: string
}

export interface TranscriptWord {
  word: string
  start: number
  end: number
  confidence: number
  punctuated_word: string
}

export interface Check {
  id: string
  name: string
  description: string | null
  category: string
  applicable_input: InputType
  is_deterministic: boolean
  default_parameters: Record<string, unknown>
  display_order: number
  created_at: string
}

export interface Workflow {
  id: string
  user_id: string
  name: string
  description: string | null
  input_type: InputType
  check_order: string[]
  custom_instructions: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Audit {
  id: string
  user_id: string
  asset_id: string
  workflow_id: string | null
  status: AuditStatus
  check_order: string[]
  custom_instructions: string | null
  summary_metrics: SummaryMetrics
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  assets?: Asset
}

export interface SummaryMetrics {
  total_findings?: number
  by_severity?: { info: number; minor: number; major: number }
  by_category?: Record<string, number>
  wpm_average?: number
  filler_count?: number
  talk_pause_ratio?: number
}

export interface FindingLocation {
  type: 'text' | 'audio'
  start_offset?: number
  end_offset?: number
  line?: number
  context?: string
  start_time?: number
  end_time?: number
  word_index?: number
}

export interface Finding {
  id: string
  audit_id: string
  check_id: string
  category: string
  severity: FindingSeverity
  title: string
  explanation: string
  location: FindingLocation
  suggested_fix: string | null
  original_text: string | null
  disposition: FindingDisposition
  user_comment: string | null
  created_at: string
  updated_at: string
}
