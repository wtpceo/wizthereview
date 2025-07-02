"use client"

import { Bell, User, Search, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { useState } from "react"

interface HeaderProps {
  onMobileMenuToggle?: () => void
  isMobileMenuOpen?: boolean
}

export function Header({ onMobileMenuToggle, isMobileMenuOpen }: HeaderProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)

  const handleSignOut = async () => {
    try {
      console.log('🔄 로그아웃 처리 시작...')
      
      // 긴급 세션 정리
      const isProduction = process.env.NODE_ENV === 'production'
      if (isProduction) {
        console.log('🛡️ 프로덕션 긴급 세션 정리 중...')
      }
      
      await signOut()
      
      console.log('✅ 로그아웃 처리 완료')
      
      // 확실한 페이지 이동과 새로고침
      window.location.href = '/login'
      
    } catch (error) {
      console.error('❌ 로그아웃 처리 오류:', error)
      
      // 긴급 상황: 강제로 모든 세션 정리 후 이동
      console.log('🚨 긴급 세션 정리 실행...')
      if (typeof window !== 'undefined') {
        // 모든 스토리지 완전 정리
        try {
          localStorage.clear()
          sessionStorage.clear()
          
          // 모든 쿠키 삭제
          document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=")
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          })
        } catch (cleanupError) {
          console.warn('⚠️ 긴급 정리 중 오류 (무시):', cleanupError)
        }
      }
      
      // 강제 페이지 이동
      window.location.href = '/login'
    }
  }

  // 역할 한국어 변환
  const getRoleText = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '슈퍼 관리자'
      case 'agency_admin':
        return '대행사 관리자'
      case 'agency_staff':
        return '대행사 직원'
      default:
        return '사용자'
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center space-x-3 flex-1">
        {/* 모바일 햄버거 메뉴 */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            className="md:hidden"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}

        {/* 검색창 */}
        <div className={`relative transition-all duration-200 ${
          isMobile && isSearchExpanded 
            ? 'flex-1' 
            : isMobile 
              ? 'w-auto' 
              : 'max-w-md w-full'
        }`}>
          {!isMobile || isSearchExpanded ? (
            <>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="빠른 검색..." 
                className="pl-10 bg-gray-50 border-0 focus:bg-white transition-colors" 
                onBlur={() => isMobile && setIsSearchExpanded(false)}
              />
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  onClick={() => setIsSearchExpanded(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchExpanded(true)}
              className="hover:bg-gray-100"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3">
        {/* 알림 */}
        <div className="relative">
          <Button variant="ghost" size="icon" className="relative hover:bg-gray-100">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
              3
            </Badge>
          </Button>
        </div>

        {/* 사용자 메뉴 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100 px-2 md:px-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              {!isMobile && (
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-24">
                    {user?.full_name || '사용자'}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-24">
                    {user?.role ? getRoleText(user.role) : '로딩 중...'}
                  </p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isMobile && (
              <>
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user?.full_name || '사용자'}
                </div>
                <div className="px-2 pb-2 text-xs text-gray-500">
                  {user?.role ? getRoleText(user.role) : '로딩 중...'}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              프로필 설정
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" />
              알림 설정
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleSignOut}>
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
