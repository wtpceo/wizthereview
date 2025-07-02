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
import { Search, Edit, Trash2, Eye, Plus, X, Download, Filter, MoreHorizontal, Info, EyeOff, Copy, Check, Shield } from "lucide-react"
import { downloadClientsExcel, downloadClientsWithPlatformsExcel } from "@/lib/excel-utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getClientPlatforms, getClients, createClient, updateClient, updateClientPlatforms } from "@/lib/database"
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
  const { user } = useAuth()
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
      loadClients()
    }
  }, [user])

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

  const handleDelete = (id: number) => {
    if (confirm("정말로 이 광고주를 삭제하시겠습니까?")) {
      const updatedClients = clients.filter((client) => client.id !== id)
      setClients(updatedClients)
      setFilteredClients(updatedClients)
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

  const openEditDialog = (client: Client) => {
    setFormData({
      storeName: client.storeName,
      businessNumber: client.businessNumber,
      ownerPhone: client.ownerPhone,
      memo: client.memo || "",
    })
    setEditingClient(client)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 현재 사용자의 대행사 ID 확인
      if (!user?.agency_id) {
        alert('❌ 대행사 정보를 찾을 수 없습니다.')
        return
      }

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
          alert('❌ 광고주 정보 수정에 실패했습니다.')
          return
        }

        // 플랫폼 정보 업데이트
        if (platformData.length > 0) {
          const { error: platformError } = await updateClientPlatforms(editingClient.id, platformData)
          if (platformError) {
            console.error('❌ 플랫폼 정보 수정 실패:', platformError)
            alert('❌ 플랫폼 정보 수정에 실패했습니다.')
            return
          }
        }

        console.log('✅ 광고주 정보 수정 성공')
        alert('✅ 광고주 정보가 성공적으로 수정되었습니다!')
      } else {
        // 새 광고주 등록
        console.log('🆕 새 광고주 등록 중...')
        
        const { data, error } = await createClient({
          store_name: formData.storeName,
          business_number: formData.businessNumber,
          owner_phone: formData.ownerPhone,
          agency_id: user.agency_id,
          memo: formData.memo,
          platforms: platformData
        })

        if (error) {
          console.error('❌ 광고주 등록 실패:', error)
          alert('❌ 광고주 등록에 실패했습니다.')
          return
        }

        console.log('✅ 광고주 등록 성공:', data)
        alert('✅ 광고주가 성공적으로 등록되었습니다!')
      }

      // 성공 후 처리
      setIsDialogOpen(false)
      resetForm()
      
      // 클라이언트 목록 새로고침
      await loadClients()
      
    } catch (error) {
      console.error('💥 예상치 못한 오류:', error)
      alert('❌ 예상치 못한 오류가 발생했습니다.')
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
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">광고주 관리</h1>
          <p className="text-gray-600 mt-1">광고주를 등록하고 관리하세요</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            className="hover:bg-green-50 hover:border-green-200 bg-transparent"
          >
            <Download className={`h-4 w-4 mr-2 ${isDownloadingExcel ? 'animate-spin' : ''}`} />
            {isDownloadingExcel ? '다운로드 중...' : '엑셀 다운로드'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNewClientDialog}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />새 광고주 등록
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
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle>검색 및 필터</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="매장명, 사업자번호, 전화번호로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger className="w-48 focus:ring-2 focus:ring-blue-500">
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
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-2" />
              검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 광고주 목록 */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>광고주 목록</CardTitle>
              <p className="text-sm text-gray-600 mt-1">총 {filteredClients.length}개의 광고주가 등록되어 있습니다</p>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              {filteredClients.length}개
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
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
