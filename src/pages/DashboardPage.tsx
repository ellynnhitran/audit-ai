import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAudit } from '@/hooks/useAudit'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilePlus, FileText, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Audit, AuditStatus } from '@/types/database'

const statusBadge: Record<AuditStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  failed: { label: 'Failed', variant: 'destructive' },
}

export default function DashboardPage() {
  const { fetchUserAudits } = useAudit()
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    fetchUserAudits().then(data => {
      setAudits(data)
      setLoading(false)
    })
  }, [])

  const totalFindings = audits.reduce((sum, a) => sum + (a.summary_metrics.total_findings ?? 0), 0)
  const majorFindings = audits.reduce((sum, a) => sum + (a.summary_metrics.by_severity?.major ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Your audit overview and quick actions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Audits</CardDescription>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : (
              <p className="text-3xl font-bold">{audits.length}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Findings</CardDescription>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : (
              <p className="text-3xl font-bold">{totalFindings}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Major Issues</CardDescription>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : (
              <p className="text-3xl font-bold">{majorFindings}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Completed</CardDescription>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-12" /> : (
              <p className="text-3xl font-bold">{audits.filter(a => a.status === 'completed').length}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/audit/new">
            <Button>
              <FilePlus className="mr-2 h-4 w-4" />
              New Audit
            </Button>
          </Link>
          <Link to="/audit/new">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Audit a Document
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Audits</h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : audits.length === 0 ? (
          <Card>
            <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
              No audits yet. Start by creating your first audit.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Findings</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map(audit => {
                  const sb = statusBadge[audit.status]
                  const assetName = (audit.assets as unknown as { name: string })?.name ?? 'Untitled'
                  const assetType = (audit.assets as unknown as { type: string })?.type ?? 'document'
                  return (
                    <TableRow
                      key={audit.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/audit/${audit.id}/review`)}
                    >
                      <TableCell className="font-medium">{assetName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{assetType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                      </TableCell>
                      <TableCell>{audit.summary_metrics.total_findings ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
