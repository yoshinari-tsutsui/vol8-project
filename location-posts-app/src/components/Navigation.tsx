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
          relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out
          transform hover:scale-105 hover:shadow-lg
          ${isActive 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }
          active:scale-95
        `}
      >
        <span className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          {children}
        </span>
        {isActive && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        )}
      </Link>
    )
  }

  return (
    <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link 
            href="/" 
            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-200"
          >
            📍 Location Posts
          </Link>
          
          <div className="flex items-center space-x-2">
            <NavLink href="/" icon="🏠">
              ホーム
            </NavLink>
            <NavLink href="/map" icon="🗺️">
              探索
            </NavLink>
            {session && (
              <NavLink 
                href={`/profile/${(session.user as { id: string }).id}`} 
                icon="👤"
              >
                マイプロフィール
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}