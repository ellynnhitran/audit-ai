import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { insforge } from '@/lib/insforge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type { UserProfile } from '@/types/database'

export default function SettingsPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    if (!user || loaded.current) return
    loaded.current = true

    insforge.database
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as UserProfile
          setProfile(p)
          setDisplayName(p.display_name ?? '')
        }
      })
  }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)

    const { error } = await insforge.database
      .from('user_profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated')
    }
    setSaving(false)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
          <CardDescription>Your current subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold capitalize">{profile?.plan ?? 'free'}</span>
            <span className="text-sm text-muted-foreground">plan</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Account deletion is not available in the MVP. Contact support for assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
