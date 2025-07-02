"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDashboardStats, getClients } from "@/lib/database"
import { useAuth, usePermission } from "@/components/auth/auth-context"

interface DashboardStats {
  totalClients: number
  newClientsThisMonth: number
  clientGrowthRate: number
  totalPlatforms: number
}

interface Client {
  id: number
  storeName: string
  businessNumber: string
  ownerPhone: string
  platforms: string[]
  registeredAt: string
  agency: string
  memo: string
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { isSuperAdmin, agencyId } = usePermission()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      // 인증 정보가 아직 로딩 중이면 대기
      if (authLoading || !user) {
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 통계 데이터 로드 (슈퍼 관리자는 모든 데이터, 아니면 자기 대행사 데이터만)
        const statsResult = await getDashboardStats(isSuperAdmin ? undefined : agencyId || undefined)
        if (statsResult.error) {
          throw new Error('통계 데이터를 불러오는데 실패했습니다.')
        }

        // 최근 클라이언트 데이터 로드
        const clientsResult = await getClients(isSuperAdmin ? undefined : agencyId || undefined)
        if (clientsResult.error) {
          throw new Error('클라이언트 데이터를 불러오는데 실패했습니다.')
        }

        setStats(statsResult.data)
        setRecentClients(clientsResult.data?.slice(0, 3) || []) // 최근 3개만 표시
      } catch (err) {
        console.error('Dashboard data loading error:', err)
        setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [authLoading, user, isSuperAdmin, agencyId])

  // 로딩 상태 (인증 정보 로딩 중이거나 데이터 로딩 중)
  if (authLoading || loading || !user) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-1">
              {authLoading || !user ? '사용자 정보를 불러오는 중...' : '데이터를 불러오고 있습니다...'}
            </p>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
        
        <Card className="p-6 text-center">
          <p className="text-gray-600 mb-4">데이터베이스 연결을 확인해주세요.</p>
          <p className="text-sm text-gray-500">
            Supabase 설정이 올바른지 확인하고, <code>.env.local</code> 파일의 환경 변수를 점검해주세요.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            다시 시도
          </Button>
        </Card>
      </div>
    )
  }

  // 통계 카드 데이터 생성
  const statsCards = [
    {
      title: "총 광고주 수",
      value: stats?.totalClients.toString() || "0",
      icon: Users,
      change: stats?.clientGrowthRate ? `${stats.clientGrowthRate > 0 ? '+' : ''}${stats.clientGrowthRate}%` : "",
      changeType: (stats?.clientGrowthRate || 0) >= 0 ? "positive" as const : "negative" as const,
      description: "지난 달 대비",
    },
    {
      title: "이번 달 신규 등록",
      value: stats?.newClientsThisMonth.toString() || "0",
      icon: TrendingUp,
      change: stats?.newClientsThisMonth ? `+${stats.newClientsThisMonth}` : "",
      changeType: "positive" as const,
      description: "신규 광고주",
    },
    {
      title: "활성 플랫폼",
      value: stats?.totalPlatforms.toString() || "0",
      icon: Building2,
      change: "",
      changeType: "neutral" as const,
      description: "등록된 플랫폼",
    },
    {
      title: "최근 업데이트",
      value: recentClients.length > 0 ? "방금 전" : "데이터 없음",
      icon: Calendar,
      change: "",
      changeType: "neutral" as const,
      description: "마지막 활동",
    },
  ]

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">
              {isSuperAdmin ? '전체 시스템 관리자' : user?.agency_name ? `${user.agency_name} 관리자` : '광고주 현황을 한눈에 확인하세요'}
            </p>
            {user?.role && (
              <Badge variant={isSuperAdmin ? "default" : "secondary"}>
                {user.role === 'super_admin' ? '슈퍼 관리자' : 
                 user.role === 'agency_admin' ? '대행사 관리자' : '대행사 직원'}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            기간 설정
          </Button>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" />
            리포트 생성
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <stat.icon className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              {stat.change && (
                <div className="flex items-center mt-2">
                  {stat.changeType === "positive" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : stat.changeType === "negative" ? (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  ) : null}
                  <span
                    className={`text-sm font-medium ml-1 ${
                      stat.changeType === "positive" 
                        ? "text-green-600" 
                        : stat.changeType === "negative" 
                        ? "text-red-600" 
                        : "text-gray-500"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">{stat.description}</span>
                </div>
              )}
              {!stat.change && (
                <p className="text-sm text-gray-500 mt-2">{stat.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최근 등록된 광고주 */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>최근 등록된 광고주</CardTitle>
            <p className="text-sm text-gray-600 mt-1">최근 활동 현황을 확인하세요</p>
          </div>
          <Button variant="outline" size="sm">
            전체 보기
          </Button>
        </CardHeader>
        <CardContent>
          {recentClients.length > 0 ? (
            <div className="space-y-4">
              {recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.storeName}</p>
                      <p className="text-sm text-gray-600">사업자번호: {client.businessNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{client.platforms.length}개 플랫폼</p>
                      <p className="text-sm text-gray-600">{client.registeredAt}</p>
                    </div>
                    <Badge variant="default">활성</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">아직 등록된 광고주가 없습니다.</p>
              <p className="text-sm text-gray-500 mt-1">첫 번째 광고주를 등록해보세요!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
