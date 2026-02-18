import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-card pt-[88px] transition-[margin-left] duration-300 ease-in-out md:ml-[250px] md:px-6 md:pb-6 md:pt-[96px] px-4 pb-4">
        {children}
      </div>
    </div>
  )
}
