import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-900">
      <Header
        onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar variant="sidebar" />
      </div>

      {/* Mobile Drawer Sidebar */}
      <div className="md:hidden">
        <Sidebar
          variant="drawer"
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="min-h-screen pt-[88px] md:ml-[250px] md:px-6 md:pb-6 md:pt-[96px] px-4 pb-4">
        {children}
      </div>
    </div>
  )
}
