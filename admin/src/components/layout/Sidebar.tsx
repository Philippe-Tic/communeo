import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { usePendingAssociationsCount } from '@/hooks/api/useAssociations'
import { useContactSubmissionsCount } from '@/hooks/api/useContactSubmissions'
import { Building2, Calendar, ChevronDown, File, FileArchive, FileText, Globe, ImageIcon, LayoutDashboard, Mail, Megaphone, Rocket, Settings, ShieldCheck, UserCog, Users, X, type LucideIcon } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUser'

interface NavItem {
  name: string
  path: string
  icon?: LucideIcon
  badgeKey?: 'messages' | 'associations'
}

interface NavGroup {
  label: string
  key: string
  items: NavItem[]
}

function buildNavGroups(canManageUsers: boolean): NavGroup[] {
  const settingsItems: NavItem[] = [
    { name: 'Site', path: '/site', icon: Settings },
    { name: 'Conformité', path: '/compliance', icon: ShieldCheck },
    { name: 'Déploiement', path: '/deployment', icon: Rocket },
    { name: 'Domaines', path: '/domain', icon: Globe },
  ]
  if (canManageUsers) {
    settingsItems.push({ name: 'Utilisateurs', path: '/users', icon: UserCog })
  }
  return [
    {
      label: 'Contenu',
      key: 'content',
      items: [
        { name: 'Articles', path: '/articles', icon: FileText },
        { name: 'Pages', path: '/pages', icon: File },
        { name: 'Événements', path: '/events', icon: Calendar },
        { name: 'Documents', path: '/documents', icon: FileArchive },
        { name: 'Alertes', path: '/alertes', icon: Megaphone },
        { name: 'Médiathèque', path: '/media', icon: ImageIcon },
      ],
    },
    {
      label: 'Communauté',
      key: 'community',
      items: [
        { name: 'Messages', path: '/messages', icon: Mail, badgeKey: 'messages' },
        { name: 'Équipe', path: '/team-members', icon: Users },
        { name: 'Associations', path: '/associations', icon: Building2, badgeKey: 'associations' },
      ],
    },
    {
      label: 'Paramètres',
      key: 'settings',
      items: settingsItems,
    },
  ]
}

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
  const { isAdmin } = useUserRole()
  const navGroups = useMemo(() => buildNavGroups(isAdmin), [isAdmin])

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

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
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
          active
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 font-semibold text-white shadow-sm dark:from-indigo-600 dark:to-indigo-500'
            : 'text-foreground hover:bg-accent dark:hover:bg-accent/50'
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
        'fixed left-0 overflow-y-auto transition-transform duration-300 ease-in-out',
        variant === 'sidebar'
          ? 'top-[72px] h-[calc(100vh-72px)] w-[250px] border-r border-white/20 bg-white/95 dark:border-white/[0.08] dark:bg-slate-900/95'
          : 'top-0 z-[1100] h-screen w-[280px] bg-white/95 shadow-xl dark:bg-slate-900/95 md:w-[250px]',
        variant === 'drawer' && !isOpen && '-translate-x-full'
      )}
    >
      {variant === 'drawer' && (
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text font-extrabold text-transparent dark:from-indigo-400 dark:to-indigo-300">Communeo</h2>
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
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
            isActive('/dashboard')
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 font-semibold text-white shadow-sm dark:from-indigo-600 dark:to-indigo-500'
              : 'text-foreground hover:bg-accent dark:hover:bg-accent/50'
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Tableau de bord</span>
        </button>

        {/* Grouped navigation with collapsible sections */}
        {navGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.key)
          return (
            <div key={group.key} className="mt-3">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="mb-1 flex w-full items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-400/70 hover:text-indigo-500 dark:text-indigo-400/50 dark:hover:text-indigo-400 transition-colors"
              >
                {group.label}
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    isCollapsed && '-rotate-90'
                  )}
                />
              </button>
              {!isCollapsed && (
                <div className="flex flex-col gap-0.5">
                  {group.items.map(renderNavButton)}
                </div>
              )}
            </div>
          )
        })}
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
