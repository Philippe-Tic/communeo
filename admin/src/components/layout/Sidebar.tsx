import { cn } from '@/lib/utils'
import { Calendar, File, FileText, Globe, LayoutDashboard, Rocket, Settings, X, type LucideIcon } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface NavItem {
  name: string
  path: string
  icon?: LucideIcon
}

const navItems: NavItem[] = [
  { name: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Articles', path: '/articles', icon: FileText },
  { name: 'Pages', path: '/pages', icon: File },
  { name: 'Événements', path: '/events', icon: Calendar },
  { name: 'Site', path: '/site', icon: Settings },
  { name: 'Déploiement', path: '/deployment', icon: Rocket },
  { name: 'Domaines', path: '/domain', icon: Globe },
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

  const handleNavClick = (path: string) => {
    navigate(path)
    if (variant === 'drawer' && onClose) {
      onClose()
    }
  }

  const sidebarContent = (
    <div
      className={cn(
        'fixed overflow-y-auto bg-muted/50 transition-all duration-300 ease-in-out',
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
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Navigation
        </p>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={cn(
                'flex items-center gap-3 rounded-md p-3 text-left text-sm transition-all',
                isActive
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-foreground hover:bg-accent'
              )}
            >
              {item.icon && <item.icon className="h-5 w-5" />}
              <span>{item.name}</span>
            </button>
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
