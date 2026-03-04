import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/useTheme'
import { useUserRole } from '@/hooks/useUser'
import { LogOut, Menu, Moon, Sun, User } from 'lucide-react'
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { isSuperAdmin } = useUserRole()
  const navigate = useNavigate()

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between border-b border-white/20 bg-white/95 px-4 py-3 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-slate-900/95 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-accent md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to={isSuperAdmin ? '/super-admin' : '/dashboard'}>
          <span
            className="inline-block h-6 bg-brand-800 dark:bg-brand-300 md:h-7"
            style={{
              aspectRatio: '538 / 70',
              maskImage: 'url(/green-logo.svg)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskImage: 'url(/green-logo.svg)',
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
            }}
            role="img"
            aria-label="Communeo"
          />
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        {user && (
          <span className="hidden text-sm text-muted-foreground lg:block">
            {user.site?.name}
          </span>
        )}

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Changer le thème" className="rounded-full">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md p-2 hover:bg-accent">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-800 to-brand-700 text-sm font-bold text-white ring-2 ring-brand-200 dark:from-brand-500 dark:to-brand-400 dark:ring-brand-800">
                  {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-muted-foreground">{user.municipality_role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-800 to-brand-700 font-bold text-white dark:from-brand-500 dark:to-brand-400">
                    {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{user.first_name} {user.last_name}</p>
                    <p className="text-sm font-normal text-muted-foreground">{user.municipality_role}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">Email:</span>&nbsp;{user.email}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <span className="text-muted-foreground">Site:</span>&nbsp;{user.site?.name}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm">Se connecter</Button>
        )}
      </div>
    </header>
  )
}
