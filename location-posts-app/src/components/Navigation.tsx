'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const NavLink = ({ href, children, icon }: { href: string; children: React.ReactNode; icon?: string }) => {
    const isActive = pathname === href
    return (
      <Link 
        href={href} 
        className={`
          relative px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 ease-in-out
          transform hover:scale-105 hover:shadow-lg
          ${isActive 
            ? 'bg-gradient-to-r from-coffee-medium to-cinnamon text-white-foam shadow-lg' 
            : 'text-coffee-medium hover:text-espresso hover:bg-latte'
          }
          active:scale-95
        `}
      >
        <span className="flex items-center gap-1 sm:gap-2">
          {icon && <span className="text-base sm:text-lg">{icon}</span>}
          {children}
        </span>
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white-foam rounded-full animate-pulse"></div>
        )}
      </Link>
    )
  }

  return (
    <nav className="bg-white-foam/95 backdrop-blur-md shadow-sm border-b border-cappuccino/50 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link 
            href="/" 
            className="text-lg sm:text-xl font-bold bg-gradient-to-r from-espresso to-coffee-medium bg-clip-text text-transparent hover:scale-105 transition-transform duration-200"
          >
            <span className="hidden sm:inline">☕ Mappuccino</span>
            <span className="sm:hidden">☕</span>
          </Link>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            <NavLink href="/" icon="🏠">
              <span className="hidden sm:inline">ホーム</span>
            </NavLink>
            <NavLink href="/map" icon="🗺️">
              <span className="hidden sm:inline">探索</span>
            </NavLink>
            {session && (
              <NavLink 
                href={`/profile/${(session.user as { id: string }).id}`} 
                icon="👤"
              >
                <span className="hidden sm:inline">マイプロフィール</span>
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}