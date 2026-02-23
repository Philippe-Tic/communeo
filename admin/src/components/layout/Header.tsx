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
import { LogOut, Menu, Moon, Sun } from 'lucide-react'
import React from 'react'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between border-b border-white/20 bg-white/95 px-4 py-3 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/95 md:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-accent md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-lg font-extrabold text-transparent dark:from-indigo-400 dark:to-indigo-300 md:text-xl">Admin CMS</h1>
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 text-sm font-bold text-white ring-2 ring-indigo-200 dark:from-indigo-500 dark:to-indigo-400 dark:ring-indigo-800">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 font-bold text-white dark:from-indigo-500 dark:to-indigo-400">
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
