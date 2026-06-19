import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FilePlus, Workflow, Settings, FileSearch } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/audit/new', icon: FilePlus, label: 'New Audit' },
  { to: '/workflows', icon: Workflow, label: 'Workflows' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FileSearch className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground">AuditAI</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
