"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, Edit, Trash2, Eye, Plus, X, Download, Filter, MoreHorizontal, Info, EyeOff, Copy, Check, Users } from "lucide-react"
import { downloadClientsExcel, downloadClientsWithPlatformsExcel } from "@/lib/excel-utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getClientPlatforms, getClients, createClient, updateClient, updateClientPlatforms, deleteClient } from "@/lib/database"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

const PLATFORMS = ["네이버플레이스", "배달의민족", "쿠팡이츠", "요기요", "땡겨요", "배달이음", "카카오매장"]

interface PlatformInfo {
  id: string
  platform: string
  platformId: string
  platformPassword: string
  shopId: string
}

interface ClientPlatform {
  id: number
  client_id: number
  platform_name: string
  platform_id: string
  platform_password: string
  shop_id: string
  created_at: string
  updated_at: string
}

interface Client {
  id: number
  storeName: string
  businessNumber: string
  ownerPhone: string
  platforms: string[]
  registeredAt: string
  agency: string
  memo?: string
}

export default function ClientsPage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAgency, setSelectedAgency] = useState("전체")
  const [filteredClients, setFilteredClients] = useState(clients)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  

  
  // 플랫폼 정보 모달 관련 상태
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false)
  const [selectedClientPlatforms, setSelectedClientPlatforms] = useState<ClientPlatform[]>([])
  const [selectedClientName, setSelectedClientName] = useState("")
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false)
  
  // 엑셀 다운로드 로딩 상태
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false)
  
  // 비밀번호 표시 상태 (플랫폼 ID별로 관리)
  const [showPasswords, setShowPasswords] = useState<{[key: number]: boolean}>({})
  const [copiedItems, setCopiedItems] = useState<{[key: string]: boolean}>({})

  // 폼 상태
  const [formData, setFormData] = useState({
    storeName: "",
    businessNumber: "",
    ownerPhone: "",
    memo: "",
  })

  const [platforms, setPlatforms] = useState<PlatformInfo[]>([
    { id: "1", platform: "", platformId: "", platformPassword: "", shopId: "" },
  ])



  // 컴포넌트 마운트 시 클라이언트 목록 로드
  const loadClients = async () => {
    try {
      console.log('📊 클라이언트 목록 로딩 중...')
      
      // 슈퍼 관리자가 아닌 경우 자신의 대행사 클라이언트만 조회
      const agencyId = user?.role === 'super_admin' ? undefined : user?.agency_id
      
      const { data, error } = await getClients(agencyId)
      if (error) {
        console.error('Error loading clients:', error)
      } else if (data) {
        console.log('✅ 클라이언트 목록 로딩 성공:', data.length)
        setClients(data)
        setFilteredClients(data)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  useEffect(() => {
    if (user) { // 사용자 정보가 로드된 후에만 실행
      console.log('👤 사용자 정보 변경 감지 - 클라이언트 목록 새로고침')
      loadClients()
    }
  }, [user])

  // 페이지 visibility 변화 감지 (다른 탭에서 돌아올 때)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && user) {
        console.log('👁️ 페이지 재활성화 감지 - 데이터 새로고침')
        try {
          await refreshUser()
          await loadClients()
        } catch (error) {
          console.warn('⚠️ 페이지 재활성화 시 새로고침 실패:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, refreshUser])

  const handleSearch = () => {
    let filtered = clients

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.businessNumber.includes(searchTerm) ||
          client.ownerPhone.includes(searchTerm),
      )
    }

    if (selectedAgency !== "전체") {
      filtered = filtered.filter((client) => client.agency === selectedAgency)
    }

    setFilteredClients(filtered)
  }

  const handleDownloadExcel = async () => {
    const dataToDownload = filteredClients.length > 0 ? filteredClients : clients
    const filename = `${user?.agency_name || 'Clime'}_광고주목록`
    
    setIsDownloadingExcel(true)
    
    try {
      await downloadClientsWithPlatformsExcel(dataToDownload, getClientPlatforms, filename)
    } catch (error) {
      console.error('엑셀 다운로드 중 오류가 발생했습니다:', error)
      // 실패시 기본 다운로드로 fallback
      downloadClientsExcel(dataToDownload, filename)
    } finally {
      setIsDownloadingExcel(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm("정말로 이 광고주를 삭제하시겠습니까?\n\n※ 삭제된 데이터는 복구할 수 없습니다.")) {
      try {
        console.log('🗑️ 광고주 삭제 중...', id)
        
        const { error } = await deleteClient(id)
        
        if (error) {
          console.error('❌ 광고주 삭제 실패:', error)
          let errorMessage = '광고주 삭제에 실패했습니다.'
          
          if (typeof error === 'string') {
            errorMessage = error
          } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = (error as any).message
          }
          
          alert(`❌ ${errorMessage}`)
          return
        }
        
        console.log('✅ 광고주 삭제 성공')
        alert('✅ 광고주가 성공적으로 삭제되었습니다!')
        
        // 삭제 성공 후 목록 새로고침
        await loadClients()
        
      } catch (error: any) {
        console.error('💥 광고주 삭제 중 예외 발생:', error)
        alert(`❌ 광고주 삭제 중 오류가 발생했습니다: ${error?.message || '알 수 없는 오류'}`)
      }
    }
  }

  const addPlatform = () => {
    if (platforms.length < 7) {
      setPlatforms([
        ...platforms,
        {
          id: Date.now().toString(),
          platform: "",
          platformId: "",
          platformPassword: "",
          shopId: "",
        },
      ])
    }
  }

  const removePlatform = (id: string) => {
    if (platforms.length > 1) {
      setPlatforms(platforms.filter((p) => p.id !== id))
    }
  }

  const updatePlatform = (id: string, field: keyof PlatformInfo, value: string) => {
    setPlatforms(platforms.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const resetForm = () => {
    setFormData({
      storeName: "",
      businessNumber: "",
      ownerPhone: "",
      memo: "",
    })
    setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "" }])
    setEditingClient(null)
  }

  const openNewClientDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = async (client: Client) => {
    try {
      console.log('📝 수정 모드: 기존 플랫폼 정보 로딩 중...', client.id)
      
      // 기본 정보 설정
      setFormData({
        storeName: client.storeName,
        businessNumber: client.businessNumber,
        ownerPhone: client.ownerPhone,
        memo: client.memo || "",
      })
      setEditingClient(client)
      
      // 기존 플랫폼 정보 불러오기
      const { data: existingPlatforms, error } = await getClientPlatforms(client.id)
      
      if (error) {
        console.error('❌ 기존 플랫폼 정보 로딩 실패:', error)
        console.warn('⚠️ 기존 플랫폼 정보를 불러올 수 없어서 빈 상태로 시작합니다.')
        // 에러가 있어도 기본 빈 플랫폼으로 시작
        setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "" }])
      } else if (existingPlatforms && existingPlatforms.length > 0) {
        console.log('✅ 기존 플랫폼 정보 로딩 성공:', existingPlatforms.length + '개')
        
        // 기존 플랫폼 정보를 폼 형태로 변환
        const platformsForForm = existingPlatforms.map((platform: any, index: number) => ({
          id: (Date.now() + index).toString(), // 고유 ID 생성
          platform: platform.platform_name || "",
          platformId: platform.platform_id || "",
          platformPassword: platform.platform_password || "",
          shopId: platform.shop_id || ""
        }))
        
        setPlatforms(platformsForForm)
        console.log('📋 플랫폼 정보 폼에 설정 완료')
      } else {
        console.log('ℹ️ 기존 플랫폼 정보 없음 - 빈 상태로 시작')
        // 기존 플랫폼 정보가 없으면 빈 플랫폼 하나로 시작
        setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "" }])
      }
      
      // 다이얼로그 열기
      setIsDialogOpen(true)
      console.log('🎉 수정 다이얼로그 준비 완료')
      
    } catch (error) {
      console.error('💥 수정 다이얼로그 준비 중 오류:', error)
      alert('❌ 수정 정보를 불러오는 중 오류가 발생했습니다.')
      
      // 오류가 발생해도 기본 정보로 다이얼로그 열기
      setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "" }])
      setIsDialogOpen(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 모든 사용자는 자신의 대행사 ID를 사용 (슈퍼 관리자도 이제 자신의 대행사를 가짐)
      if (!user?.agency_id) {
        alert('❌ 대행사 정보를 찾을 수 없습니다. 관리자에게 문의하세요.')
        return
      }
      
      const targetAgencyId = user.agency_id

      // 플랫폼 정보 준비
      const platformData = platforms
        .filter(p => p.platform) // 플랫폼이 선택된 것만
        .map(p => ({
          platform_name: p.platform,
          platform_id: p.platformId,
          platform_password: p.platformPassword,
          shop_id: p.shopId
        }))

      if (editingClient) {
        // 수정 모드
        console.log('📝 광고주 정보 수정 중...', editingClient.id)
        
        const { data, error } = await updateClient(editingClient.id, {
          store_name: formData.storeName,
          business_number: formData.businessNumber,
          owner_phone: formData.ownerPhone,
          memo: formData.memo
        })

        if (error) {
          console.error('❌ 광고주 수정 실패:', error)
          // 수정 실패 시 구체적인 메시지 표시
          let errorMessage = '광고주 정보 수정에 실패했습니다.'
          if (typeof error === 'string') {
            errorMessage = error
          } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = (error as any).message
          }
          alert(`❌ ${errorMessage}`)
          return
        }

        // 플랫폼 정보 업데이트 (빈 배열이어도 기존 플랫폼 삭제를 위해 항상 실행)
        console.log('🔧 플랫폼 정보 업데이트 중...', platformData.length + '개')
        const { error: platformError } = await updateClientPlatforms(editingClient.id, platformData)
        if (platformError) {
          console.error('❌ 플랫폼 정보 수정 실패:', platformError)
          let platformErrorMessage = '플랫폼 정보 수정에 실패했습니다.'
          if (typeof platformError === 'string') {
            platformErrorMessage = platformError
          } else if (platformError && typeof platformError === 'object' && 'message' in platformError) {
            platformErrorMessage = (platformError as any).message
          }
          alert(`❌ ${platformErrorMessage}`)
          return
        }
        console.log('✅ 플랫폼 정보 업데이트 완료')

        console.log('✅ 광고주 정보 수정 성공')
        alert('✅ 광고주 정보가 성공적으로 수정되었습니다!')
      } else {
        // 새 광고주 등록
        console.log('🆕 새 광고주 등록 중...')
        
        const result = await createClient({
          store_name: formData.storeName,
          business_number: formData.businessNumber,
          owner_phone: formData.ownerPhone,
          agency_id: targetAgencyId,
          memo: formData.memo,
          platforms: platformData
        })

        if (result.error) {
          console.error('❌ 광고주 등록 실패:', result.error)
          
          // 더 나은 에러 메시지 표시
          let errorMessage = result.error
          
          // 특정 에러 케이스별 안내 메시지
          if (result.error.includes('이미 등록된 업체')) {
            errorMessage = `⚠️ ${result.error}\n\n다른 사업자번호를 입력하거나 기존 업체 정보를 확인해 주세요.`
          } else if (result.error.includes('사업자번호') && result.error.includes('이미 등록')) {
            errorMessage = `⚠️ ${result.error}\n\n※ 사업자번호는 중복 등록이 불가능합니다.`
          } else if (result.error.includes('duplicate key')) {
            errorMessage = '⚠️ 이미 등록된 정보가 있습니다. 입력한 내용을 다시 확인해 주세요.'
          }
          
          alert(`❌ ${errorMessage}`)
          return
        }

        console.log('✅ 광고주 등록 성공:', result.data)
        alert(`✅ ${result.message || '광고주가 성공적으로 등록되었습니다!'}`)
      }

      // 성공 후 처리
      setIsDialogOpen(false)
      resetForm()
      
      // 사용자 정보 새로고침 (인증 세션 동기화)
      console.log('🔄 사용자 정보 새로고침 중...')
      try {
        await refreshUser()
        console.log('✅ 사용자 정보 새로고침 완료')
      } catch (error) {
        console.warn('⚠️ 사용자 정보 새로고침 실패 (무시):', error)
      }
      
      // 클라이언트 목록 새로고침
      await loadClients()
      
    } catch (error: any) {
      console.error('💥 예상치 못한 오류:', error)
      
      // 예상치 못한 오류 시에도 도움이 되는 메시지 제공
      let errorMessage = '예상치 못한 오류가 발생했습니다.'
      
      if (error?.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '네트워크 연결을 확인해 주세요.'
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = '권한이 없습니다. 관리자에게 문의하세요.'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(`❌ ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 플랫폼 정보 조회 함수
  const handleViewPlatforms = async (clientId: number, clientName: string) => {
    setIsLoadingPlatforms(true)
    setSelectedClientName(clientName)
    setIsPlatformModalOpen(true)
    setShowPasswords({}) // 비밀번호 표시 상태 초기화
    setCopiedItems({}) // 복사 상태 초기화
    
    try {
      const { data, error } = await getClientPlatforms(clientId)
      if (error) {
        console.error('Error fetching platforms:', error)
        setSelectedClientPlatforms([])
      } else {
        setSelectedClientPlatforms((data as unknown as ClientPlatform[]) || [])
      }
    } catch (error) {
      console.error('Error fetching platforms:', error)
      setSelectedClientPlatforms([])
    } finally {
      setIsLoadingPlatforms(false)
    }
  }

  // 비밀번호 표시/숨김 토글
  const togglePasswordVisibility = (platformId: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [platformId]: !prev[platformId]
    }))
  }

  // 클립보드 복사 함수
  const copyToClipboard = async (text: string, itemKey: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => ({ ...prev, [itemKey]: true }))
      
      // 2초 후 복사 상태 초기화
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemKey]: false }))
      }, 2000)
    } catch (error) {
      console.error('클립보드 복사 실패:', error)
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">광고주 관리</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">광고주를 등록하고 관리하세요</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            className="hover:bg-green-50 hover:border-green-200 bg-transparent text-sm"
            size="sm"
          >
            <Download className={`h-4 w-4 sm:mr-2 ${isDownloadingExcel ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isDownloadingExcel ? '다운로드 중...' : '엑셀 다운로드'}</span>
            <span className="sm:hidden">{isDownloadingExcel ? '다운로드...' : '엑셀'}</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNewClientDialog}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">새 광고주 등록</span>
                <span className="sm:hidden">등록</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">{editingClient ? "광고주 정보 수정" : "새 광고주 등록"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 기본 정보 */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
                  </div>
                  

                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="storeName" className="text-sm font-medium">
                        매장명 *
                      </Label>
                      <Input
                        id="storeName"
                        value={formData.storeName}
                        onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                        className="focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessNumber" className="text-sm font-medium">
                        사업자등록번호 *
                      </Label>
                      <Input
                        id="businessNumber"
                        placeholder="000-00-00000"
                        value={formData.businessNumber}
                        onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                        className="focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone" className="text-sm font-medium">
                      사장님 휴대폰번호 *
                    </Label>
                    <Input
                      id="ownerPhone"
                      placeholder="010-0000-0000"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                      className="focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memo" className="text-sm font-medium">
                      메모
                    </Label>
                    <Textarea
                      id="memo"
                      placeholder="추가 정보나 특이사항을 입력하세요"
                      value={formData.memo}
                      onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 플랫폼 정보 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-6 bg-purple-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">플랫폼 정보</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPlatform}
                      disabled={platforms.length >= 7}
                      className="hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      플랫폼 추가
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {platforms.map((platform, index) => (
                      <div
                        key={platform.id}
                        className="border border-gray-200 rounded-xl p-6 space-y-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">플랫폼 {index + 1}</h4>
                          {platforms.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePlatform(platform.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">플랫폼명</Label>
                            <Select
                              value={platform.platform}
                              onValueChange={(value) => updatePlatform(platform.id, "platform", value)}
                            >
                              <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
                                <SelectValue placeholder="플랫폼을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {PLATFORMS.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">플랫폼 아이디</Label>
                            <Input
                              value={platform.platformId}
                              onChange={(e) => updatePlatform(platform.id, "platformId", e.target.value)}
                              className="focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">플랫폼 비밀번호</Label>
                            <Input
                              type="password"
                              value={platform.platformPassword}
                              onChange={(e) => updatePlatform(platform.id, "platformPassword", e.target.value)}
                              className="focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">샵 아이디</Label>
                            <Input
                              value={platform.shopId}
                              onChange={(e) => updatePlatform(platform.id, "shopId", e.target.value)}
                              className="focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingClient ? '수정 중...' : '등록 중...'}
                      </>
                    ) : (
                      editingClient ? "수정 완료" : "등록 완료"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
            <CardTitle className="text-lg md:text-xl">검색 및 필터</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="매장명, 사업자번호, 전화번호로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                <SelectTrigger className="w-full sm:w-40 md:w-48 focus:ring-2 focus:ring-blue-500 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["전체", "ABC 광고대행사", "XYZ 마케팅", "123 디지털"].map((agency) => (
                    <SelectItem key={agency} value={agency}>
                      {agency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSearch} 
                className="bg-blue-600 hover:bg-blue-700 text-sm"
                size="sm"
              >
                <Search className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">검색</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 광고주 목록 */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-lg md:text-xl">광고주 목록</CardTitle>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">총 {filteredClients.length}개의 광고주가 등록되어 있습니다</p>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200 w-fit">
              {filteredClients.length}개
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* 데스크톱 테이블 */}
          <div className="hidden md:block rounded-lg border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">매장명</TableHead>
                  <TableHead className="font-semibold">사업자번호</TableHead>
                  <TableHead className="font-semibold">연락처</TableHead>
                  <TableHead className="font-semibold">플랫폼</TableHead>
                  <TableHead className="font-semibold">대행사</TableHead>
                  <TableHead className="font-semibold">등록일</TableHead>
                  <TableHead className="font-semibold">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium">{client.storeName}</TableCell>
                    <TableCell className="text-gray-600">{client.businessNumber}</TableCell>
                    <TableCell className="text-gray-600">{client.ownerPhone}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {client.platforms.slice(0, 2).map((platform) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                        {client.platforms.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{client.platforms.length - 2}
                          </Badge>
                        )}
                        {client.platforms.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPlatforms(client.id, client.storeName)}
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Info className="h-3 w-3 mr-1" />
                            정보보기
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.agency}</Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">{client.registeredAt}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            상세보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(client)}>
                            <Edit className="h-4 w-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 모바일 카드 */}
          <div className="block md:hidden space-y-3">
            {filteredClients.map((client) => (
              <div key={client.id} className="border border-gray-200 rounded-lg p-4 space-y-3 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{client.storeName}</h3>
                    <p className="text-xs text-gray-600 mt-1">사업자: {client.businessNumber}</p>
                    <p className="text-xs text-gray-600">연락처: {client.ownerPhone}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        상세보기
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(client)}>
                        <Edit className="h-4 w-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex flex-wrap items-center gap-1">
                  {client.platforms.slice(0, 3).map((platform) => (
                    <Badge key={platform} variant="secondary" className="text-xs">
                      {platform}
                    </Badge>
                  ))}
                  {client.platforms.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{client.platforms.length - 3}
                    </Badge>
                  )}
                  {client.platforms.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPlatforms(client.id, client.storeName)}
                      className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 ml-1"
                    >
                      <Info className="h-3 w-3 mr-1" />
                      정보보기
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline" className="text-xs">{client.agency}</Badge>
                  <span className="text-gray-500">{client.registeredAt}</span>
                </div>
              </div>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">등록된 광고주가 없습니다.</p>
                <p className="text-sm text-gray-500 mt-1">새 광고주를 등록해보세요!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 플랫폼 정보 모달 */}
      <Dialog open={isPlatformModalOpen} onOpenChange={setIsPlatformModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              플랫폼 정보 - {selectedClientName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingPlatforms ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">플랫폼 정보를 불러오는 중...</span>
              </div>
            ) : selectedClientPlatforms.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  총 {selectedClientPlatforms.length}개의 플랫폼이 등록되어 있습니다.
                </div>
                
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {selectedClientPlatforms.map((platform, index) => (
                    <div key={platform.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {platform.platform_name}
                        </h3>
                        <Badge variant="secondary">플랫폼 {index + 1}</Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-600">플랫폼 아이디:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono bg-white px-2 py-1 rounded border">
                              {platform.platform_id || '-'}
                            </span>
                            {platform.platform_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(platform.platform_id, `platform_id_${platform.id}`)}
                                className="p-1 h-6 w-6"
                                title="복사"
                              >
                                {copiedItems[`platform_id_${platform.id}`] ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-600">샵 아이디:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono bg-white px-2 py-1 rounded border">
                              {platform.shop_id || '-'}
                            </span>
                            {platform.shop_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(platform.shop_id, `shop_id_${platform.id}`)}
                                className="p-1 h-6 w-6"
                                title="복사"
                              >
                                {copiedItems[`shop_id_${platform.id}`] ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-600">비밀번호:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono bg-white px-2 py-1 rounded border">
                              {platform.platform_password ? (
                                showPasswords[platform.id] ? platform.platform_password : '••••••••'
                              ) : '-'}
                            </span>
                            {platform.platform_password && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePasswordVisibility(platform.id)}
                                  className="p-1 h-6 w-6"
                                  title={showPasswords[platform.id] ? "비밀번호 숨기기" : "비밀번호 보기"}
                                >
                                  {showPasswords[platform.id] ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(platform.platform_password, `password_${platform.id}`)}
                                  className="p-1 h-6 w-6"
                                  title="비밀번호 복사"
                                >
                                  {copiedItems[`password_${platform.id}`] ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-medium text-gray-600">등록일:</span>
                          <span className="text-gray-500">
                            {new Date(platform.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600">수정일:</span>
                          <span className="text-gray-500">
                            {new Date(platform.updated_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                등록된 플랫폼 정보가 없습니다.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button variant="outline" onClick={() => setIsPlatformModalOpen(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
