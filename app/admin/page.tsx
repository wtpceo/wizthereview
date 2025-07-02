"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Building2, Users, TrendingUp, Calendar, Eye, Edit, Trash2, Download, Info, EyeOff, Copy, Check, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { downloadClientsExcel, downloadAgenciesExcel } from "@/lib/excel-utils"
import { getClientPlatforms, getAgencies, getClients } from "@/lib/database"

// 플랫폼 정보 인터페이스
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

// 데이터 타입 정의
interface Agency {
  id: number
  name: string
  email: string
  phone: string
  status: string
  created_at: string
  clientCount?: number
  registeredAt?: string
}

interface Client {
  id: number
  storeName: string
  businessNumber: string
  ownerPhone: string
  platforms: string[]
  registeredAt: string
  agency: string
  agencyId?: number
  memo?: string
}

export default function AdminPage() {
  // 데이터 상태
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [allClients, setAllClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // UI 상태
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAgency, setSelectedAgency] = useState("전체")
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [selectedAgencyForView, setSelectedAgencyForView] = useState<number | null>(null)
  const [isAgencyClientsDialogOpen, setIsAgencyClientsDialogOpen] = useState(false)
  
  // 플랫폼 정보 모달 상태
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false)
  const [selectedClientPlatforms, setSelectedClientPlatforms] = useState<ClientPlatform[]>([])
  const [selectedClientName, setSelectedClientName] = useState("")
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false)
  
  // 비밀번호 표시 상태 (플랫폼 ID별로 관리)
  const [showPasswords, setShowPasswords] = useState<{[key: number]: boolean}>({})
  const [copiedItems, setCopiedItems] = useState<{[key: string]: boolean}>({})
  
  // 대행사 추가 모달 상태
  const [isAddAgencyModalOpen, setIsAddAgencyModalOpen] = useState(false)
  const [isCreatingAgency, setIsCreatingAgency] = useState(false)
  const [agencyFormData, setAgencyFormData] = useState({
    name: '',
    email: '',
    phone: '',
    adminEmail: '',
    adminPassword: '',
    adminName: ''
  })

  // 데이터 로딩 함수
  const loadData = async () => {
    setIsLoading(true)
    try {
      console.log('📊 데이터 로딩 시작...')
      
      // 대행사 목록 가져오기
      const { data: agenciesData, error: agenciesError } = await getAgencies()
      if (agenciesError) {
        console.error('대행사 로딩 실패:', agenciesError)
      } else {
        console.log('✅ 대행사 로딩 성공:', agenciesData?.length)
        
        // 데이터 변환
        const transformedAgencies: Agency[] = agenciesData?.map((agency: any) => ({
          id: agency.id,
          name: agency.name,
          email: agency.email,
          phone: agency.phone,
          status: agency.status,
          created_at: agency.created_at,
          registeredAt: agency.created_at ? agency.created_at.split('T')[0] : '',
          clientCount: 0 // 나중에 계산
        })) || []
        
        setAgencies(transformedAgencies)
      }
      
      // 광고주 목록 가져오기
      const { data: clientsData, error: clientsError } = await getClients()
      if (clientsError) {
        console.error('광고주 로딩 실패:', clientsError)
      } else {
        console.log('✅ 광고주 로딩 성공:', clientsData?.length)
        setAllClients(clientsData || [])
        setFilteredClients(clientsData || [])
      }
      
    } catch (error) {
      console.error('데이터 로딩 중 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 로딩
  useEffect(() => {
    loadData()
  }, [])

  // 클라이언트 수 계산 (대행사별)
  useEffect(() => {
    if (agencies.length > 0 && allClients.length > 0) {
      const updatedAgencies = agencies.map(agency => ({
        ...agency,
        clientCount: allClients.filter(client => client.agency === agency.name).length
      }))
      
      // 변경사항이 있을 때만 업데이트
      const hasChanges = updatedAgencies.some((updated, index) => 
        updated.clientCount !== agencies[index]?.clientCount
      )
      
      if (hasChanges) {
        setAgencies(updatedAgencies)
      }
    }
  }, [allClients.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // 통계 계산
  const totalAgencies = agencies.length
  const activeAgencies = agencies.filter((a: Agency) => a.status === "active").length
  const totalClients = allClients.length
  const totalPlatforms = allClients.reduce((sum: number, client: Client) => sum + client.platforms.length, 0)

  const handleSearch = () => {
    let filtered = allClients

    if (searchTerm) {
      filtered = filtered.filter(
        (client: Client) =>
          client.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.businessNumber.includes(searchTerm) ||
          client.ownerPhone.includes(searchTerm) ||
          client.agency.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedAgency !== "전체") {
      filtered = filtered.filter((client: Client) => client.agency === selectedAgency)
    }

    setFilteredClients(filtered)
  }

  const handleDownloadAgenciesExcel = () => {
    downloadAgenciesExcel(agencies, "전체_대행사목록")
  }

  const handleDownloadClientsExcel = () => {
    const dataToDownload = filteredClients.length > 0 ? filteredClients : allClients
    downloadClientsExcel(dataToDownload, "전체_광고주목록")
  }

  const handleDownloadAgencyClientsExcel = (agencyId: number) => {
    const agencyClients = getAgencyClients(agencyId)
    const agencyName = agencies.find((a) => a.id === agencyId)?.name || "대행사"
    downloadClientsExcel(agencyClients, `${agencyName}_광고주목록`)
  }

  const handleDeleteAgency = (id: number) => {
    if (confirm("정말로 이 대행사를 삭제하시겠습니까? 관련된 모든 광고주 정보도 함께 삭제됩니다.")) {
      console.log("Delete agency:", id)
    }
  }

  const handleDeleteClient = (id: number) => {
    if (confirm("정말로 이 광고주를 삭제하시겠습니까?")) {
      console.log("Delete client:", id)
    }
  }

  const getAgencyClients = (agencyId: number) => {
    const agency = agencies.find(a => a.id === agencyId)
    return allClients.filter((client: Client) => client.agency === agency?.name)
  }

  const handleViewAgencyClients = (agencyId: number) => {
    console.log("Viewing clients for agency:", agencyId)
    setSelectedAgencyForView(agencyId)
    setIsAgencyClientsDialogOpen(true)
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

  // 대행사 추가 함수 (API 호출)
  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agencyFormData.name || !agencyFormData.email || !agencyFormData.adminEmail || !agencyFormData.adminPassword) {
      alert('필수 항목을 모두 입력해주세요.')
      return
    }
    
    setIsCreatingAgency(true)
    
    try {
      console.log('🚀 API 호출 시작: 대행사 생성')
      
      const response = await fetch('/api/admin/create-agency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agencyFormData),
      })

      const result = await response.json()
      
      console.log('📋 API 응답:', result)

      if (result.success) {
        alert('🎉 대행사가 성공적으로 추가되었습니다!')
        setIsAddAgencyModalOpen(false)
        resetAgencyForm()
        // 데이터 새로고침
        await loadData()
      } else {
        alert(`❌ 대행사 추가 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('대행사 추가 오류:', error)
      alert('❌ 대행사 추가 중 오류가 발생했습니다.')
    } finally {
      setIsCreatingAgency(false)
    }
  }

  // 대행사 폼 초기화
  const resetAgencyForm = () => {
    setAgencyFormData({
      name: '',
      email: '',
      phone: '',
      adminEmail: '',
      adminPassword: '',
      adminName: ''
    })
  }

  // 폼 입력 핸들러
  const handleAgencyFormChange = (field: string, value: string) => {
    setAgencyFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">전체 관리</h1>
        <p className="text-gray-600">모든 대행사와 광고주를 관리하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 대행사 수</CardTitle>
            <Building2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgencies}</div>
            <p className="text-xs text-green-600">활성: {activeAgencies}개</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 광고주 수</CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-gray-600">전체 등록 업체</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 플랫폼 수</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlatforms}</div>
            <p className="text-xs text-gray-600">등록된 플랫폼</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">평균 플랫폼</CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients > 0 ? (totalPlatforms / totalClients).toFixed(1) : "0.0"}</div>
            <p className="text-xs text-gray-600">업체당 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* 탭 메뉴 */}
      <Tabs defaultValue="agencies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agencies">대행사 관리</TabsTrigger>
          <TabsTrigger value="clients">전체 광고주</TabsTrigger>
        </TabsList>

        {/* 대행사 관리 탭 */}
        <TabsContent value="agencies" className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>대행사 목록 ({agencies.length}개)</CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsAddAgencyModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  새 대행사 추가
                </Button>
                <Button variant="outline" onClick={handleDownloadAgenciesExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>대행사명</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>광고주 수</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies.map((agency) => (
                    <TableRow key={agency.id}>
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell>{agency.email}</TableCell>
                      <TableCell>{agency.phone}</TableCell>
                      <TableCell>{agency.clientCount}개</TableCell>
                      <TableCell>{agency.registeredAt}</TableCell>
                      <TableCell>
                        <Badge variant={agency.status === "active" ? "default" : "secondary"}>
                          {agency.status === "active" ? "활성" : agency.status === "inactive" ? "비활성" : "대기"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAgencyClients(agency.id)}
                            title="광고주 보기"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="수정">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteAgency(agency.id)} title="삭제">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 전체 광고주 탭 */}
        <TabsContent value="clients" className="space-y-6">
          {/* 검색 및 필터 */}
          <Card>
            <CardHeader>
              <CardTitle>검색 및 필터</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="매장명, 사업자번호, 전화번호, 대행사명으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체 대행사</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.name}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 전체 광고주 목록 */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>전체 광고주 목록 ({filteredClients.length}개)</CardTitle>
              <Button variant="outline" onClick={handleDownloadClientsExcel}>
                <Download className="h-4 w-4 mr-2" />
                엑셀 다운로드
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>사업자번호</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>플랫폼</TableHead>
                    <TableHead>대행사</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.storeName}</TableCell>
                      <TableCell>{client.businessNumber}</TableCell>
                      <TableCell>{client.ownerPhone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1">
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
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPlatforms(client.id, client.storeName)}
                            className="p-1 h-6 w-6"
                            title="플랫폼 정보 보기"
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.agency}</Badge>
                      </TableCell>
                      <TableCell>{client.registeredAt}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" title="상세보기">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="수정">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.id)} title="삭제">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 대행사별 광고주 목록 다이얼로그 */}
      <Dialog open={isAgencyClientsDialogOpen} onOpenChange={setIsAgencyClientsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {selectedAgencyForView && agencies.find((a) => a.id === selectedAgencyForView)?.name} - 광고주 목록
              </DialogTitle>
              {selectedAgencyForView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadAgencyClientsExcel(selectedAgencyForView)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  엑셀 다운로드
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedAgencyForView && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                총 {getAgencyClients(selectedAgencyForView).length}개의 광고주가 등록되어 있습니다.
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>사업자번호</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>플랫폼</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead>관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAgencyClients(selectedAgencyForView).map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.storeName}</TableCell>
                      <TableCell>{client.businessNumber}</TableCell>
                      <TableCell>{client.ownerPhone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1">
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
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPlatforms(client.id, client.storeName)}
                            className="p-1 h-6 w-6"
                            title="플랫폼 정보 보기"
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{client.registeredAt}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" title="상세보기">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="수정">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.id)} title="삭제">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        </DialogContent>
      </Dialog>

      {/* 대행사 추가 모달 */}
      <Dialog open={isAddAgencyModalOpen} onOpenChange={setIsAddAgencyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              새 대행사 추가
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAgency} className="space-y-6">
            {/* 대행사 기본 정보 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">대행사 기본 정보</h3>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agencyName" className="text-sm font-medium">
                    대행사명 *
                  </Label>
                  <Input
                    id="agencyName"
                    value={agencyFormData.name}
                    onChange={(e) => handleAgencyFormChange('name', e.target.value)}
                    placeholder="예: XYZ 마케팅"
                    className="focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="agencyEmail" className="text-sm font-medium">
                    대행사 대표 이메일 *
                  </Label>
                  <Input
                    id="agencyEmail"
                    type="email"
                    value={agencyFormData.email}
                    onChange={(e) => handleAgencyFormChange('email', e.target.value)}
                    placeholder="contact@agency.com"
                    className="focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agencyPhone" className="text-sm font-medium">
                  연락처
                </Label>
                <Input
                  id="agencyPhone"
                  value={agencyFormData.phone}
                  onChange={(e) => handleAgencyFormChange('phone', e.target.value)}
                  placeholder="02-1234-5678"
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 관리자 계정 정보 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-6 bg-purple-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">관리자 계정 정보</h3>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminName" className="text-sm font-medium">
                    관리자 이름 *
                  </Label>
                  <Input
                    id="adminName"
                    value={agencyFormData.adminName}
                    onChange={(e) => handleAgencyFormChange('adminName', e.target.value)}
                    placeholder="홍길동"
                    className="focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adminEmail" className="text-sm font-medium">
                    관리자 로그인 이메일 *
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={agencyFormData.adminEmail}
                    onChange={(e) => handleAgencyFormChange('adminEmail', e.target.value)}
                    placeholder="admin@agency.com"
                    className="focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminPassword" className="text-sm font-medium">
                  관리자 비밀번호 *
                </Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={agencyFormData.adminPassword}
                  onChange={(e) => handleAgencyFormChange('adminPassword', e.target.value)}
                  placeholder="8자리 이상, 영문+숫자+특수문자"
                  className="focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500">
                  비밀번호는 8자리 이상이며, 영문, 숫자, 특수문자를 포함해주세요.
                </p>
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setIsAddAgencyModalOpen(false)
                  resetAgencyForm()
                }}
                disabled={isCreatingAgency}
              >
                취소
              </Button>
              <Button 
                type="submit"
                disabled={isCreatingAgency}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isCreatingAgency ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    대행사 추가
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
