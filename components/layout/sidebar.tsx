"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Building2, LogOut, Shield, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useAuth } from "@/components/auth/auth-context"

const navigation = [
  {
    name: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "광고주 관리",
    href: "/clients",
    icon: Users,
  },
]

const adminNavigation = [
  {
    name: "전체 관리",
    href: "/admin",
    icon: Shield,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user, signOut } = useAuth()
  
  // 슈퍼 관리자인지 확인
  const isSuperAdmin = user?.role === 'super_admin'

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-gradient-to-b from-gray-900 to-gray-800 border-r border-gray-700 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* 헤더 */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className={cn("flex items-center", isCollapsed && "justify-center w-full")}>
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!isCollapsed && <span className="ml-3 text-xl font-bold text-white">Clime</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-400 hover:text-white hover:bg-gray-700"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-2 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white",
                isCollapsed && "justify-center",
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && item.name}
            </Link>
          )
        })}

        {/* 관리자 메뉴 - 슈퍼 관리자만 표시 */}
        {isSuperAdmin && (
          <>
            <div className="border-t border-gray-700 my-4"></div>
            {!isCollapsed && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">관리자</p>
              </div>
            )}
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white",
                    isCollapsed && "justify-center",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && item.name}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* 로그아웃 버튼 */}
      <div className="p-3 border-t border-gray-700">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full text-gray-300 hover:bg-red-600/10 hover:text-red-400 transition-colors",
            isCollapsed ? "justify-center px-0" : "justify-start",
          )}
          title={isCollapsed ? "로그아웃" : undefined}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && "로그아웃"}
        </Button>
      </div>
    </div>
  )
}
