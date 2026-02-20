import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { usePendingAssociationsCount } from '@/hooks/api/useAssociations'
import { useContactSubmissionsCount } from '@/hooks/api/useContactSubmissions'
import { Building2, Calendar, File, FileArchive, FileText, Globe, LayoutDashboard, Mail, Megaphone, Rocket, Settings, ShieldCheck, Users, X, type LucideIcon } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface NavItem {
  name: string
  path: string
  icon?: LucideIcon
  badgeKey?: 'messages' | 'associations'
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Contenu',
    items: [
      { name: 'Articles', path: '/articles', icon: FileText },
      { name: 'Pages', path: '/pages', icon: File },
      { name: 'Événements', path: '/events', icon: Calendar },
      { name: 'Documents', path: '/documents', icon: FileArchive },
      { name: 'Alertes', path: '/alertes', icon: Megaphone },
    ],
  },
  {
    label: 'Communauté',
    items: [
      { name: 'Messages', path: '/messages', icon: Mail, badgeKey: 'messages' },
      { name: 'Équipe', path: '/team-members', icon: Users },
      { name: 'Associations', path: '/associations', icon: Building2, badgeKey: 'associations' },
    ],
  },
  {
    label: 'Paramètres',
    items: [
      { name: 'Site', path: '/site', icon: Settings },
      { name: 'Conformité', path: '/compliance', icon: ShieldCheck },
      { name: 'Déploiement', path: '/deployment', icon: Rocket },
      { name: 'Domaines', path: '/domain', icon: Globe },
    ],
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  variant?: 'drawer' | 'sidebar'
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  variant = 'sidebar'
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: messagesCount } = useContactSubmissionsCount()
  const { data: pendingAssociationsCount } = usePendingAssociationsCount()

  const badgeCounts: Record<string, number | undefined> = {
    messages: messagesCount,
    associations: pendingAssociationsCount,
  }

  const handleNavClick = (path: string) => {
    navigate(path)
    if (variant === 'drawer' && onClose) {
      onClose()
    }
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  const renderNavButton = (item: NavItem) => {
    const active = isActive(item.path)
    const count = item.badgeKey ? badgeCounts[item.badgeKey] : undefined

    return (
      <button
        key={item.path}
        onClick={() => handleNavClick(item.path)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
          active
            ? 'bg-primary font-semibold text-primary-foreground'
            : 'text-foreground hover:bg-accent'
        )}
      >
        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        <span className="flex-1">{item.name}</span>
        {count !== undefined && count > 0 && (
          <Badge
            variant={active ? 'secondary' : 'default'}
            className="h-5 min-w-5 px-1.5 text-[10px]"
          >
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </button>
    )
  }

  const sidebarContent = (
    <div
      className={cn(
        'fixed overflow-y-auto bg-muted/50 transition-[left] duration-300 ease-in-out',
        variant === 'sidebar'
          ? 'top-[72px] left-0 h-[calc(100vh-72px)] w-[250px] border-r'
          : 'top-0 left-0 z-[1100] h-screen w-[280px] shadow-xl md:w-[250px]',
        variant === 'drawer' && !isOpen && '-left-full'
      )}
    >
      {variant === 'drawer' && (
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold text-primary">Admin CMS</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1 p-4">
        {/* Dashboard - standalone */}
        <button
          onClick={() => handleNavClick('/dashboard')}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
            isActive('/dashboard')
              ? 'bg-primary font-semibold text-primary-foreground'
              : 'text-foreground hover:bg-accent'
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Tableau de bord</span>
        </button>

        {/* Grouped navigation */}
        {navGroups.map((group) => (
          <div key={group.label} className="mt-4">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(renderNavButton)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (variant === 'drawer') {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-[1050] bg-black/60"
            onClick={onClose}
          />
        )}
        {sidebarContent}
      </>
    )
  }

  return sidebarContent
}
