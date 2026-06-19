import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, FileDown } from 'lucide-react'
import { jsPDF } from 'jspdf'
import type { Finding, Audit, Asset } from '@/types/database'

interface ExportButtonProps {
  audit: Audit
  asset: Asset
  findings: Finding[]
}

function generateMarkdown(audit: Audit, asset: Asset, findings: Finding[]): string {
  const lines: string[] = []
  lines.push(`# Audit Report: ${asset.name}`)
  lines.push(`Generated: ${new Date().toLocaleDateString()}`)
  lines.push('')

  const metrics = audit.summary_metrics
  lines.push('## Summary')
  lines.push(`- **Total Findings:** ${metrics.total_findings ?? findings.length}`)
  if (metrics.by_severity) {
    lines.push(`- **Major:** ${metrics.by_severity.major} | **Minor:** ${metrics.by_severity.minor} | **Info:** ${metrics.by_severity.info}`)
  }
  if (metrics.wpm_average) lines.push(`- **Average WPM:** ${metrics.wpm_average}`)
  if (metrics.filler_count) lines.push(`- **Filler Words:** ${metrics.filler_count}`)
  lines.push('')

  const groups: Record<string, Finding[]> = { major: [], minor: [], info: [] }
  for (const f of findings) groups[f.severity].push(f)

  for (const [severity, label] of [['major', 'Major Issues'], ['minor', 'Minor Issues'], ['info', 'Informational']] as const) {
    const items = groups[severity]
    if (items.length === 0) continue

    lines.push(`## ${label}`)
    for (const f of items) {
      lines.push(`### ${f.title}`)
      lines.push(`**Category:** ${f.category} | **Status:** ${f.disposition}`)
      lines.push('')
      lines.push(f.explanation)
      if (f.original_text) lines.push(`\n> ${f.original_text}`)
      if (f.suggested_fix) lines.push(`\n**Suggestion:** ${f.suggested_fix}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

function downloadBlob(content: string | Blob, filename: string, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({ audit, asset, findings }: ExportButtonProps) {
  function exportMarkdown() {
    const md = generateMarkdown(audit, asset, findings)
    downloadBlob(md, `${asset.name}-audit-report.md`, 'text/markdown')
  }

  function exportPDF() {
    const doc = new jsPDF()
    const md = generateMarkdown(audit, asset, findings)
    const lines = md.split('\n')

    let y = 20
    const pageHeight = doc.internal.pageSize.height - 20

    for (const line of lines) {
      if (y > pageHeight) {
        doc.addPage()
        y = 20
      }

      if (line.startsWith('# ')) {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text(line.replace('# ', ''), 15, y)
        y += 10
      } else if (line.startsWith('## ')) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(line.replace('## ', ''), 15, y)
        y += 8
      } else if (line.startsWith('### ')) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(line.replace('### ', ''), 15, y)
        y += 7
      } else if (line.startsWith('- ')) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const wrapped = doc.splitTextToSize(line, 175)
        doc.text(wrapped, 20, y)
        y += wrapped.length * 5
      } else if (line.startsWith('> ')) {
        doc.setFontSize(9)
        doc.setFont('courier', 'normal')
        const wrapped = doc.splitTextToSize(line.replace('> ', ''), 165)
        doc.text(wrapped, 25, y)
        y += wrapped.length * 4.5
      } else if (line.trim()) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const clean = line.replace(/\*\*/g, '')
        const wrapped = doc.splitTextToSize(clean, 175)
        doc.text(wrapped, 15, y)
        y += wrapped.length * 5
      } else {
        y += 3
      }
    }

    doc.save(`${asset.name}-audit-report.pdf`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportPDF}>
          <FileDown className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportMarkdown}>
          <FileText className="mr-2 h-4 w-4" />
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
