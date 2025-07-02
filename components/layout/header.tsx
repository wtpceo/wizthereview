"use client"

import { Bell, User, Search } from "lucide-react"
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

export function Header() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      console.log('🔄 로그아웃 처리 시작...')
      await signOut()
      
      // 로그아웃 후 로그인 페이지로 리다이렉트
      router.push('/login')
      
      // 페이지 새로고침으로 확실히 세션 정리
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
      
      console.log('✅ 로그아웃 처리 완료')
    } catch (error) {
      console.error('❌ 로그아웃 처리 오류:', error)
      // 오류가 발생해도 로그인 페이지로 리다이렉트
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
    <header className="flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-sm px-6 sticky top-0 z-40">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input placeholder="빠른 검색..." className="pl-10 bg-gray-50 border-0 focus:bg-white transition-colors" />
        </div>
      </div>

      <div className="flex items-center space-x-3">
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
            <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-100">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">
                  {user?.full_name || '사용자'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role ? getRoleText(user.role) : '로딩 중...'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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
