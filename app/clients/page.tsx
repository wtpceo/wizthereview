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
import { Search, Edit, Trash2, Eye, Plus, X, Download, Filter, MoreHorizontal, Info, Copy, Check, Users, Upload, File, Paperclip, RefreshCw, ChevronUp, ChevronDown } from "lucide-react"
import { downloadClientsExcel, downloadClientsWithPlatformsExcel } from "@/lib/excel-utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getClientPlatforms, getClients, createClient, updateClient, updateClientPlatforms, deleteClient, uploadClientFile, getClientFiles, getFileDownloadUrl, deleteClientFile, checkFileSystemAvailable } from "@/lib/database"
import { useAuth } from "@/components/auth/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileType, FILE_TYPE_LABELS, ClientFile } from "@/lib/types"
import ExcelUpload from "@/components/excel-upload"

const PLATFORMS = ["네이버플레이스", "배달의민족", "쿠팡이츠", "요기요", "땡겨요", "배달이음", "카카오매장"]

interface PlatformInfo {
  id: string
  platform: string
  platformId: string
  platformPassword: string
  shopId: string
  answerGuide: string
}

interface ClientPlatform {
  id: number
  client_id: number
  platform_name: string
  platform_id: string
  platform_password: string
  shop_id: string
  answer_guide: string
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
  guide?: string
  service?: string
  contractMonths: number
  contractStartDate?: string
  contractPeriod?: number | null
  contractEndDate?: string
}

// 계약 만료 상태 체크 함수
const getContractStatus = (endDate: string | undefined) => {
  if (!endDate) return null
  
  const today = new Date()
  const contractEnd = new Date(endDate)
  const daysUntilExpiry = Math.floor((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntilExpiry < 0) {
    return { status: 'expired', label: '만료됨', className: 'bg-red-100 text-red-800' }
  } else if (daysUntilExpiry <= 30) {
    return { status: 'expiring', label: `${daysUntilExpiry}일 남음`, className: 'bg-orange-100 text-orange-800' }
  } else {
    return { status: 'active', label: `${Math.floor(daysUntilExpiry / 30)}개월 남음`, className: 'bg-green-100 text-green-800' }
  }
}

export default function ClientsPage() {
  console.log("ClientsPage 컴포넌트 렌더링 시작")
  
  const { user, refreshUser } = useAuth()
  
  console.log("현재 user 상태:", user)
  
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAgency, setSelectedAgency] = useState("전체")
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 필터 상태 추가
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'expiring'>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  
  // 정렬 상태 추가
  type SortColumn = 'storeName' | 'businessNumber' | 'ownerPhone' | 'platforms' | 'agency' | 'guide' | 'service' | 'memo' | 'contractMonths' | 'contractEndDate' | 'registeredAt'
  type SortDirection = 'asc' | 'desc'
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  
  // 엑셀 업로드 모달 상태
  const [isExcelUploadModalOpen, setIsExcelUploadModalOpen] = useState(false)
  
  // 구글 시트 동기화 상태
  const googleSheetId = "1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM"
  const [isSyncing, setIsSyncing] = useState(false)
  
  // 플랫폼 정보 모달 관련 상태
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false)
  const [selectedClientPlatforms, setSelectedClientPlatforms] = useState<ClientPlatform[]>([])
  const [selectedClientName, setSelectedClientName] = useState("")
  const [isLoadingPlatforms, setIsLoadingPlatforms] = useState(false)
  
  // 엑셀 다운로드 로딩 상태
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false)
  
  // 복사 상태 관리
  const [copiedItems, setCopiedItems] = useState<{[key: string]: boolean}>({})

  // 폼 상태
  const [formData, setFormData] = useState({
    storeName: "",
    businessNumber: "",
    ownerPhone: "",
    memo: "",
    guide: "",
    service: "",
    contractMonths: 12,
  })

  const [platforms, setPlatforms] = useState<PlatformInfo[]>([
    { id: "1", platform: "", platformId: "", platformPassword: "", shopId: "", answerGuide: "" },
  ])

  // 파일 업로드 관련 상태
  const [uploadingFiles, setUploadingFiles] = useState<{[key in FileType]?: boolean}>({})
  const [clientFiles, setClientFiles] = useState<ClientFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [fileSystemAvailable, setFileSystemAvailable] = useState(true)

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
      
      // 파일 시스템 사용 가능 여부 초기 확인
      console.log('🔍 파일 시스템 초기 상태 확인 중...')
      const systemAvailable = await checkFileSystemAvailable()
      setFileSystemAvailable(systemAvailable)
      console.log('📁 파일 시스템 상태:', systemAvailable ? '사용 가능' : '사용 불가')
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
  
  // 필터가 변경될 때마다 자동으로 검색
  useEffect(() => {
    handleSearch()
  }, [clients, searchTerm, selectedAgency, filterStatus, filterPlatform, sortColumn, sortDirection])

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
    
    // 계약 상태 필터
    if (filterStatus !== 'all') {
      filtered = filtered.filter((client) => {
        if (!client.contractEndDate) return filterStatus === 'all'
        
        const status = getContractStatus(client.contractEndDate)
        if (!status) return false
        
        switch (filterStatus) {
          case 'active':
            return status.status === 'active'
          case 'expired':
            return status.status === 'expired'
          case 'expiring':
            return status.status === 'expiring'
          default:
            return true
        }
      })
    }
    
    // 플랫폼 필터
    if (filterPlatform !== 'all') {
      filtered = filtered.filter((client) => {
        // 클라이언트의 플랫폼 정보가 있고, 선택한 플랫폼을 포함하는지 확인
        return client.platforms?.some(p => p.platform_name === filterPlatform)
      })
    }

    // 정렬 적용
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortColumn]
        let bValue: any = b[sortColumn]
        
        // platforms 배열인 경우 길이로 비교
        if (sortColumn === 'platforms') {
          aValue = Array.isArray(a.platforms) ? a.platforms.length : 0
          bValue = Array.isArray(b.platforms) ? b.platforms.length : 0
        }
        
        // 날짜 필드인 경우
        if (sortColumn === 'registeredAt' || sortColumn === 'contractEndDate') {
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        }
        
        // 숫자 필드인 경우
        if (sortColumn === 'contractMonths') {
          aValue = Number(aValue) || 0
          bValue = Number(bValue) || 0
        }
        
        // null/undefined 처리
        if (aValue === null || aValue === undefined) aValue = ''
        if (bValue === null || bValue === undefined) bValue = ''
        
        // 문자열 비교
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue)
        }
        
        // 숫자 비교
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
        }
      })
    }

    setFilteredClients(filtered)
  }
  
  // 정렬 컬럼 클릭 핸들러
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // 같은 컬럼 클릭 시 방향 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // 다른 컬럼 클릭 시 해당 컬럼으로 변경하고 오름차순으로 시작
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleDownloadExcel = async () => {
    const dataToDownload = filteredClients.length > 0 ? filteredClients : clients
    const filename = `${user?.agency_name || 'Clime'}_광고주목록`
    
    console.log('🔄 엑셀 다운로드 시작:', {
      사용자정보: {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        agency_id: user?.agency_id,
        agency_name: user?.agency_name
      },
      광고주수: dataToDownload.length,
      파일명: filename
    })
    
    setIsDownloadingExcel(true)
    
    try {
      // 광고주 상세 정보 (플랫폼 및 파일 포함) 다운로드 시도
      const result = await downloadClientsWithPlatformsExcel(dataToDownload, getClientPlatforms, getClientFiles, filename)
      
      if (result.success) {
        console.log('✅ 엑셀 다운로드 성공:', result.filename)
        
        // 사용자에게 다운로드 결과 알림
        const { 총_광고주수, 플랫폼_조회_성공, 플랫폼_조회_실패 } = result.summary
        
        if (플랫폼_조회_실패 > 0) {
          alert(`📊 엑셀 다운로드 완료!\n\n` +
            `✅ 총 ${총_광고주수}개 광고주 정보 다운로드\n` +
            `✅ ${플랫폼_조회_성공}개 광고주의 플랫폼 정보 포함\n` +
            `⚠️ ${플랫폼_조회_실패}개 광고주의 플랫폼 정보 조회 실패\n\n` +
            `※ 파일명: ${result.filename}\n` +
            `※ 플랫폼 정보는 "2. 플랫폼 계정정보" 시트에서 확인하세요.`)
        } else {
          alert(`📊 엑셀 다운로드 완료!\n\n` +
            `✅ 총 ${총_광고주수}개 광고주 정보 다운로드\n` +
            `✅ 모든 플랫폼 정보 포함\n\n` +
            `※ 파일명: ${result.filename}\n` +
            `※ 플랫폼 정보는 "2. 플랫폼 계정정보" 시트에서 확인하세요.`)
        }
      }
    } catch (error) {
      console.error('❌ 엑셀 다운로드 중 오류가 발생했습니다:', error)
      
      // 실패시 기본 다운로드로 fallback
      console.log('🔄 기본 엑셀 다운로드로 fallback')
      try {
        downloadClientsExcel(dataToDownload, filename)
        alert(`⚠️ 플랫폼 정보 조회에 실패하여 기본 정보만 다운로드됩니다.\n\n` +
          `✅ 총 ${dataToDownload.length}개 광고주 기본 정보 다운로드\n` +
          `❌ 플랫폼 계정 정보는 포함되지 않습니다.\n\n` +
          `※ 플랫폼 정보가 필요하시면 새로고침 후 다시 시도해주세요.`)
      } catch (fallbackError: any) {
        console.error('❌ 기본 엑셀 다운로드도 실패:', fallbackError)
        alert(`❌ 엑셀 다운로드에 실패했습니다.\n\n` +
          `오류: ${fallbackError?.message || '알 수 없는 오류'}\n\n` +
          `※ 페이지를 새로고침 후 다시 시도해주세요.`)
      }
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
          answerGuide: "",
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
      guide: "",
      service: "",
      contractMonths: 12,
    })
    setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "", answerGuide: "" }])
    setEditingClient(null)
    setClientFiles([])
    setUploadingFiles({})
  }

  // 파일 업로드 함수
  const handleFileUpload = async (fileType: FileType, file: File, clientId?: number) => {
    if (!file) return

    const targetClientId = clientId || editingClient?.id
    if (!targetClientId) {
      alert('❌ 클라이언트 ID를 찾을 수 없습니다.')
      return
    }

    try {
      setUploadingFiles(prev => ({ ...prev, [fileType]: true }))

      const result = await uploadClientFile({
        client_id: targetClientId,
        file_type: fileType,
        file: file
      })

      if (result.success) {
        console.log('✅ 파일 업로드 성공:', result.file_id)
        alert(`✅ ${FILE_TYPE_LABELS[fileType]} 파일이 성공적으로 업로드되었습니다!`)
        
        // 파일 목록 새로고침
        if (editingClient) {
          await loadClientFiles(targetClientId)
        }
      } else {
        console.error('❌ 파일 업로드 실패:', result.error)
        alert(`❌ ${result.error}`)
      }
    } catch (error: any) {
      console.error('💥 파일 업로드 중 예외:', error)
      alert(`❌ 파일 업로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fileType]: false }))
    }
  }

  // 클라이언트 파일 목록 로드
  const loadClientFiles = async (clientId: number) => {
    try {
      setIsLoadingFiles(true)
      console.log('📁 클라이언트 파일 목록 로딩:', clientId)

      const { data, error } = await getClientFiles(clientId)
      
      console.log('📁 파일 목록 조회 결과:', { data, error, hasError: !!error })
      
      if (error) {
        console.error('❌ 파일 목록 로딩 실패:', {
          errorType: typeof error,
          errorKeys: error ? Object.keys(error) : [],
          errorStringified: JSON.stringify(error),
          error
        })
        setClientFiles([])
        setFileSystemAvailable(false)
        console.log('ℹ️ 파일 시스템을 비활성화합니다. (데이터베이스 설정이 필요할 수 있습니다)')
      } else {
        console.log('✅ 파일 목록 로딩 성공:', data?.length || 0)
        setClientFiles(data || [])
        
        // 빈 배열이라도 에러가 없으면 파일 시스템은 활성화
        setFileSystemAvailable(true)
      }
    } catch (error) {
      console.error('💥 파일 목록 로딩 중 예외:', error)
      setClientFiles([])
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // 파일 다운로드
  const handleFileDownload = async (file: ClientFile) => {
    try {
      console.log('📥 파일 다운로드 시작:', file.file_name)

      const { url, error } = await getFileDownloadUrl(file.file_path)
      
      if (error || !url) {
        console.error('❌ 다운로드 URL 생성 실패:', error)
        alert('❌ 파일 다운로드에 실패했습니다.')
        return
      }

      // 새 창에서 파일 다운로드
      const link = document.createElement('a')
      link.href = url
      link.download = file.file_name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log('✅ 파일 다운로드 시작됨')
    } catch (error: any) {
      console.error('💥 파일 다운로드 중 예외:', error)
      alert(`❌ 파일 다운로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    }
  }

  // 파일 삭제
  const handleFileDelete = async (file: ClientFile) => {
    if (!confirm(`"${file.file_name}" 파일을 삭제하시겠습니까?\n\n삭제된 파일은 복구할 수 없습니다.`)) {
      return
    }

    try {
      console.log('🗑️ 파일 삭제 시작:', file.file_name)

      const result = await deleteClientFile(file.id)
      
      if (result.success) {
        console.log('✅ 파일 삭제 성공')
        alert('✅ 파일이 성공적으로 삭제되었습니다!')
        
        // 파일 목록에서 제거
        setClientFiles(prev => prev.filter(f => f.id !== file.id))
      } else {
        console.error('❌ 파일 삭제 실패:', result.error)
        alert(`❌ ${result.error}`)
      }
    } catch (error: any) {
      console.error('💥 파일 삭제 중 예외:', error)
      alert(`❌ 파일 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    }
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
        guide: client.guide || "",
        service: client.service || "",
        contractMonths: client.contractMonths || 12,
      })
      setEditingClient(client)
      
      // 기존 플랫폼 정보 불러오기
      const { data: existingPlatforms, error } = await getClientPlatforms(client.id)
      
      if (error) {
        console.error('❌ 기존 플랫폼 정보 로딩 실패:', error)
        console.warn('⚠️ 기존 플랫폼 정보를 불러올 수 없어서 빈 상태로 시작합니다.')
        // 에러가 있어도 기본 빈 플랫폼으로 시작
        setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "", answerGuide: "" }])
      } else if (existingPlatforms && existingPlatforms.length > 0) {
        console.log('✅ 기존 플랫폼 정보 로딩 성공:', existingPlatforms.length + '개')
        
        // 기존 플랫폼 정보를 폼 형태로 변환
        const platformsForForm = existingPlatforms.map((platform: any, index: number) => ({
          id: (Date.now() + index).toString(), // 고유 ID 생성
          platform: platform.platform_name || "",
          platformId: platform.platform_id || "",
          platformPassword: platform.platform_password || "",
          shopId: platform.shop_id || "",
          answerGuide: platform.answer_guide || ""
        }))
        
        setPlatforms(platformsForForm)
        console.log('📋 플랫폼 정보 폼에 설정 완료')
      } else {
        console.log('ℹ️ 기존 플랫폼 정보 없음 - 빈 상태로 시작')
        // 기존 플랫폼 정보가 없으면 빈 플랫폼 하나로 시작
        setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "", answerGuide: "" }])
      }
      
      // 파일 시스템 사용 가능 여부 먼저 확인
      console.log('🔍 파일 시스템 사용 가능 여부 확인 중...')
      const systemAvailable = await checkFileSystemAvailable()
      setFileSystemAvailable(systemAvailable)
      
      // 파일 시스템이 사용 가능한 경우에만 파일 목록 로드
      if (systemAvailable) {
        console.log('📁 기존 파일 목록 로딩 중...')
        try {
          await loadClientFiles(client.id)
        } catch (error) {
          console.warn('⚠️ 파일 목록 로딩 실패 - 계속 진행:', error)
          setClientFiles([])
        }
      } else {
        console.log('ℹ️ 파일 시스템을 사용할 수 없으므로 파일 목록 로딩을 건너뜁니다.')
        setClientFiles([])
      }
      
      // 다이얼로그 열기
      setIsDialogOpen(true)
      console.log('🎉 수정 다이얼로그 준비 완료')
      
    } catch (error) {
      console.error('💥 수정 다이얼로그 준비 중 오류:', error)
      alert('❌ 수정 정보를 불러오는 중 오류가 발생했습니다.')
      
      // 오류가 발생해도 기본 정보로 다이얼로그 열기
      setPlatforms([{ id: "1", platform: "", platformId: "", platformPassword: "", shopId: "", answerGuide: "" }])
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
          shop_id: p.shopId,
          answer_guide: p.answerGuide
        }))

      if (editingClient) {
        // 수정 모드
        console.log('📝 광고주 정보 수정 중...', editingClient.id)
        
        const { error } = await updateClient(editingClient.id, {
          store_name: formData.storeName,
          business_number: formData.businessNumber,
          owner_phone: formData.ownerPhone,
          memo: formData.memo,
          guide: formData.guide,
          service: formData.service,
          contract_months: formData.contractMonths
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
          guide: formData.guide,
          service: formData.service,
          contract_months: formData.contractMonths,
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

  // 엑셀 업로드 핸들러
  const handleExcelUpload = (data: any[]) => {
    // 업로드 성공 후 데이터 새로고침
    loadClients()
    setIsExcelUploadModalOpen(false)
    alert(`${data.length}개의 광고주가 성공적으로 등록되었습니다.`)
  }

  // 구글 시트 동기화 함수
  const handleGoogleSync = async () => {
    const confirmed = confirm('구글 시트에 모든 광고주 데이터를 동기화하시겠습니까?')
    if (!confirmed) return

    setIsSyncing(true)
    try {
      const response = await fetch('/api/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId: '1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM',
          type: 'all'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ 구글 시트 동기화 완료!\n\n${result.message || '성공적으로 동기화되었습니다.'}`)
      } else {
        alert(`❌ 동기화 실패: ${result.error || '알 수 없는 오류'}`)
      }
    } catch (error: any) {
      console.error('Google sync error:', error)
      alert(`❌ 동기화 중 오류 발생: ${error.message || '네트워크 오류'}`)
    } finally {
      setIsSyncing(false)
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
            onClick={handleGoogleSync}
            disabled={isSyncing}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-sm"
            size="sm"
          >
            {isSyncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white sm:mr-2"></div>
                <span className="hidden sm:inline">동기화 중...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">구글 시트 동기화</span>
                <span className="sm:hidden">동기화</span>
              </>
            )}
          </Button>
          <Button
            onClick={() => setIsExcelUploadModalOpen(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm"
            size="sm"
          >
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">엑셀 업로드</span>
            <span className="sm:hidden">업로드</span>
          </Button>
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
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="guide" className="text-sm font-medium">
                        지침
                      </Label>
                      <Textarea
                        id="guide"
                        placeholder="관리 지침이나 가이드를 입력하세요"
                        value={formData.guide}
                        onChange={(e) => setFormData({ ...formData, guide: e.target.value })}
                        className="focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service" className="text-sm font-medium">
                        서비스
                      </Label>
                      <Textarea
                        id="service"
                        placeholder="제공하는 서비스 내용을 입력하세요"
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractMonths" className="text-sm font-medium">
                      계약 개월수 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="contractMonths"
                      type="number"
                      min="1"
                      max="120"
                      placeholder="계약 개월수를 입력하세요"
                      value={formData.contractMonths}
                      onChange={(e) => setFormData({ ...formData, contractMonths: parseInt(e.target.value) || 12 })}
                      className="focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      계약 개월수는 1개월 ~ 120개월 사이로 입력해주세요.
                    </p>
                  </div>
                </div>

                {/* 플랫폼 정보 */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-6 bg-purple-600 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-gray-900">플랫폼 정보</h3>
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

                        {/* 세로 정렬로 변경 - 사용자 편의성 향상 */}
                        <div className="space-y-4">
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
                              placeholder="플랫폼 로그인 아이디를 입력하세요"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">플랫폼 비밀번호</Label>
                            <Input
                              type="text"
                              value={platform.platformPassword}
                              onChange={(e) => updatePlatform(platform.id, "platformPassword", e.target.value)}
                              className="focus:ring-2 focus:ring-blue-500"
                              placeholder="플랫폼 로그인 비밀번호를 입력하세요"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">샵 아이디</Label>
                            <Input
                              value={platform.shopId}
                              onChange={(e) => updatePlatform(platform.id, "shopId", e.target.value)}
                              className="focus:ring-2 focus:ring-blue-500"
                              placeholder="샵 아이디를 입력하세요"
                            />
                          </div>
                        </div>
                        
                        {/* 답변 지침 - 전체 너비 */}
                        <div className="space-y-2 mt-4">
                          <Label className="text-sm font-medium">답변 지침 (선택사항)</Label>
                          <textarea
                            value={platform.answerGuide}
                            onChange={(e) => updatePlatform(platform.id, "answerGuide", e.target.value)}
                            placeholder="이 플랫폼 관련 문의나 설정 시 참고할 지침이나 메모를 입력하세요..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                            rows={3}
                          />
                          <p className="text-xs text-gray-500">
                            고객 문의나 설정 변경 시 참고할 지침을 입력해주세요.
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* 플랫폼 추가 버튼을 아래쪽으로 이동 */}
                    <div className="flex justify-center pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPlatform}
                        disabled={platforms.length >= 7}
                        className="hover:bg-blue-50 px-8"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        플랫폼 추가 ({platforms.length}/7)
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 파일 업로드 섹션 */}
                {editingClient && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-6 bg-green-600 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">파일 관리</h3>
                      {!fileSystemAvailable && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          설정 필요
                        </Badge>
                      )}
                    </div>

                    {!fileSystemAvailable && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Info className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-orange-800">
                              파일 업로드 기능을 사용하려면 데이터베이스 설정이 필요합니다
                            </h4>
                            <div className="text-xs text-orange-700 space-y-2">
                              <div>
                                <p className="font-medium">1단계: Supabase 대시보드 → SQL Editor에서 다음을 실행:</p>
                                <div className="mt-1 bg-orange-100 p-2 rounded text-orange-800 font-mono text-xs">
                                  add-client-files-table.sql 파일의 내용 전체
                                </div>
                              </div>
                              <div>
                                <p className="font-medium">2단계: Storage 설정</p>
                                <p>• Storage → New bucket → 이름: "client-files" (비공개)</p>
                                <p>• 상세 설정은 SUPABASE_FILE_UPLOAD_SETUP.md 참조</p>
                              </div>
                              <div>
                                <p className="font-medium">3단계: 페이지 새로고침</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <p>설정 완료 후:</p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      console.log('🔄 파일 시스템 상태 재확인 중...')
                                      const available = await checkFileSystemAvailable()
                                      setFileSystemAvailable(available)
                                      if (available) {
                                        alert('✅ 파일 시스템이 활성화되었습니다!')
                                      } else {
                                        alert('❌ 아직 설정이 완료되지 않았습니다. 설정을 다시 확인해주세요.')
                                      }
                                    }}
                                    className="h-6 px-2 text-xs bg-orange-200 hover:bg-orange-300 text-orange-800 border-orange-300"
                                  >
                                    상태 재확인
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {fileSystemAvailable && !isLoadingFiles && (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          {/* 신분증 */}
                          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-2">
                              <File className="h-4 w-4 text-blue-600" />
                              <h4 className="font-medium text-gray-900">신분증</h4>
                            </div>
                            
                            {/* 기존 파일 표시 */}
                            {clientFiles.find(f => f.file_type === 'id_card') ? (
                              <div className="space-y-2">
                                {(() => {
                                  const file = clientFiles.find(f => f.file_type === 'id_card')!
                                  return (
                                    <div className="bg-gray-50 rounded p-2">
                                      <p className="text-xs font-medium text-gray-900 truncate">{file.file_name}</p>
                                      <p className="text-xs text-gray-500">
                                        {(file.file_size / 1024).toFixed(1)}KB · {new Date(file.uploaded_at).toLocaleDateString()}
                                      </p>
                                      <div className="flex space-x-1 mt-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleFileDownload(file)}
                                          className="h-6 px-2 text-xs"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          다운로드
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleFileDelete(file)}
                                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          삭제
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">업로드된 파일이 없습니다.</p>
                            )}

                            {/* 파일 업로드 */}
                            <div className="space-y-2">
                              <input
                                type="file"
                                id="id_card_upload"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file && editingClient) {
                                    handleFileUpload('id_card', file, editingClient.id)
                                  }
                                }}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('id_card_upload')?.click()}
                                disabled={uploadingFiles.id_card}
                                className="w-full h-8 text-xs"
                              >
                                {uploadingFiles.id_card ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600 mr-1"></div>
                                    업로드 중...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 mr-1" />
                                    파일 선택
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* 계약서 */}
                          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="h-4 w-4 text-purple-600" />
                              <h4 className="font-medium text-gray-900">계약서</h4>
                            </div>
                            
                            {/* 기존 파일 표시 */}
                            {clientFiles.find(f => f.file_type === 'contract') ? (
                              <div className="space-y-2">
                                {(() => {
                                  const file = clientFiles.find(f => f.file_type === 'contract')!
                                  return (
                                    <div className="bg-gray-50 rounded p-2">
                                      <p className="text-xs font-medium text-gray-900 truncate">{file.file_name}</p>
                                      <p className="text-xs text-gray-500">
                                        {(file.file_size / 1024).toFixed(1)}KB · {new Date(file.uploaded_at).toLocaleDateString()}
                                      </p>
                                      <div className="flex space-x-1 mt-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleFileDownload(file)}
                                          className="h-6 px-2 text-xs"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          다운로드
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleFileDelete(file)}
                                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          삭제
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">업로드된 파일이 없습니다.</p>
                            )}

                            {/* 파일 업로드 */}
                            <div className="space-y-2">
                              <input
                                type="file"
                                id="contract_upload"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file && editingClient) {
                                    handleFileUpload('contract', file, editingClient.id)
                                  }
                                }}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('contract_upload')?.click()}
                                disabled={uploadingFiles.contract}
                                className="w-full h-8 text-xs"
                              >
                                {uploadingFiles.contract ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600 mr-1"></div>
                                    업로드 중...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 mr-1" />
                                    파일 선택
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* 사업자 등록증 */}
                          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-2">
                              <File className="h-4 w-4 text-orange-600" />
                              <h4 className="font-medium text-gray-900">사업자 등록증</h4>
                            </div>
                            
                            {/* 기존 파일 표시 */}
                            {clientFiles.find(f => f.file_type === 'business_registration') ? (
                              <div className="space-y-2">
                                {(() => {
                                  const file = clientFiles.find(f => f.file_type === 'business_registration')!
                                  return (
                                    <div className="bg-gray-50 rounded p-2">
                                      <p className="text-xs font-medium text-gray-900 truncate">{file.file_name}</p>
                                      <p className="text-xs text-gray-500">
                                        {(file.file_size / 1024).toFixed(1)}KB · {new Date(file.uploaded_at).toLocaleDateString()}
                                      </p>
                                      <div className="flex space-x-1 mt-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleFileDownload(file)}
                                          className="h-6 px-2 text-xs"
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          다운로드
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleFileDelete(file)}
                                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3 mr-1" />
                                          삭제
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">업로드된 파일이 없습니다.</p>
                            )}

                            {/* 파일 업로드 */}
                            <div className="space-y-2">
                              <input
                                type="file"
                                id="business_registration_upload"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file && editingClient) {
                                    handleFileUpload('business_registration', file, editingClient.id)
                                  }
                                }}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('business_registration_upload')?.click()}
                                disabled={uploadingFiles.business_registration}
                                className="w-full h-8 text-xs"
                              >
                                {uploadingFiles.business_registration ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600 mr-1"></div>
                                    업로드 중...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 mr-1" />
                                    파일 선택
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-xs text-blue-800">
                            <strong>지원 파일 형식:</strong> JPG, PNG, WebP, PDF, DOC, DOCX
                            <br />
                            <strong>최대 파일 크기:</strong> 10MB
                            <br />
                            <strong>참고:</strong> 파일 업로드는 수정 모드에서만 가능합니다.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

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
          <div className="space-y-4">
            {/* 검색 바 */}
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
            
            {/* 필터 옵션 */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 border-t">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">계약 상태</Label>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500 text-sm">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        계약 유효
                      </div>
                    </SelectItem>
                    <SelectItem value="expiring">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        만료 임박 (30일 이내)
                      </div>
                    </SelectItem>
                    <SelectItem value="expired">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        계약 만료
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1 block">플랫폼</Label>
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger className="w-full focus:ring-2 focus:ring-blue-500 text-sm">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {PLATFORMS.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('storeName')}
                  >
                    <div className="flex items-center gap-1">
                      매장명
                      {sortColumn === 'storeName' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('businessNumber')}
                  >
                    <div className="flex items-center gap-1">
                      사업자번호
                      {sortColumn === 'businessNumber' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('ownerPhone')}
                  >
                    <div className="flex items-center gap-1">
                      연락처
                      {sortColumn === 'ownerPhone' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('platforms')}
                  >
                    <div className="flex items-center gap-1">
                      플랫폼
                      {sortColumn === 'platforms' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('agency')}
                  >
                    <div className="flex items-center gap-1">
                      대행사
                      {sortColumn === 'agency' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('guide')}
                  >
                    <div className="flex items-center gap-1">
                      지침
                      {sortColumn === 'guide' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('service')}
                  >
                    <div className="flex items-center gap-1">
                      서비스
                      {sortColumn === 'service' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('memo')}
                  >
                    <div className="flex items-center gap-1">
                      메모
                      {sortColumn === 'memo' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">파일</TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('contractMonths')}
                  >
                    <div className="flex items-center gap-1">
                      계약기간
                      {sortColumn === 'contractMonths' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('contractEndDate')}
                  >
                    <div className="flex items-center gap-1">
                      계약종료일
                      {sortColumn === 'contractEndDate' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('registeredAt')}
                  >
                    <div className="flex items-center gap-1">
                      등록일
                      {sortColumn === 'registeredAt' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
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
                    <TableCell className="text-gray-600 max-w-32">
                      <div className="truncate text-sm" title={client.guide || ''}>
                        {client.guide || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 max-w-32">
                      <div className="truncate text-sm" title={client.service || ''}>
                        {client.service || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 max-w-32">
                      <div className="truncate text-sm" title={client.memo || ''}>
                        {client.memo || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(client)}
                        className="h-6 px-2 text-xs text-green-600 hover:text-green-800 hover:bg-green-50"
                      >
                        <File className="h-3 w-3 mr-1" />
                        파일관리
                      </Button>
                    </TableCell>
                    <TableCell className="text-gray-600 text-center">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {client.contractMonths}개월
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {client.contractEndDate ? (
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            {new Date(client.contractEndDate).toLocaleDateString('ko-KR')}
                          </div>
                          {(() => {
                            const status = getContractStatus(client.contractEndDate)
                            return status ? (
                              <Badge variant="secondary" className={`text-xs ${status.className}`}>
                                {status.label}
                              </Badge>
                            ) : null
                          })()}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
                
                {/* 추가 정보 */}
                <div className="space-y-2">
                  {client.guide && (
                    <div className="text-xs">
                      <span className="font-medium text-gray-700">지침:</span>
                      <p className="text-gray-600 mt-1 line-clamp-2">{client.guide}</p>
                    </div>
                  )}
                  {client.service && (
                    <div className="text-xs">
                      <span className="font-medium text-gray-700">서비스:</span>
                      <p className="text-gray-600 mt-1 line-clamp-2">{client.service}</p>
                    </div>
                  )}
                  {client.memo && (
                    <div className="text-xs">
                      <span className="font-medium text-gray-700">메모:</span>
                      <p className="text-gray-600 mt-1 line-clamp-2">{client.memo}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{client.agency}</Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      {client.contractMonths}개월
                    </Badge>
                    {client.contractEndDate && (() => {
                      const status = getContractStatus(client.contractEndDate)
                      return status ? (
                        <Badge variant="secondary" className={`text-xs ${status.className}`}>
                          {status.label}
                        </Badge>
                      ) : null
                    })()}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(client)}
                      className="h-5 px-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50"
                    >
                      <File className="h-3 w-3 mr-1" />
                      파일
                    </Button>
                  </div>
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
                
                <div className="space-y-4">
                  {selectedClientPlatforms.map((platform, index) => (
                    <div key={platform.id} className="border border-gray-200 rounded-lg p-6 space-y-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {platform.platform_name}
                        </h3>
                        <Badge variant="secondary">플랫폼 {index + 1}</Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-600 text-sm w-20">플랫폼 아이디:</span>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="font-mono bg-white px-3 py-2 rounded border flex-1">
                                {platform.platform_id || '-'}
                              </span>
                              {platform.platform_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(platform.platform_id, `platform_id_${platform.id}`)}
                                  className="p-2 h-8 w-8"
                                  title="복사"
                                >
                                  {copiedItems[`platform_id_${platform.id}`] ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-600 text-sm w-20">비밀번호:</span>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="font-mono bg-white px-3 py-2 rounded border flex-1">
                                {platform.platform_password || '-'}
                              </span>
                              {platform.platform_password && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(platform.platform_password, `password_${platform.id}`)}
                                  className="p-2 h-8 w-8"
                                  title="비밀번호 복사"
                                >
                                  {copiedItems[`password_${platform.id}`] ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-600 text-sm w-20">샵 아이디:</span>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="font-mono bg-white px-3 py-2 rounded border flex-1">
                                {platform.shop_id || '-'}
                              </span>
                              {platform.shop_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(platform.shop_id, `shop_id_${platform.id}`)}
                                  className="p-2 h-8 w-8"
                                  title="복사"
                                >
                                  {copiedItems[`shop_id_${platform.id}`] ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between pt-2 border-t text-sm">
                          <span className="font-medium text-gray-600">등록일:</span>
                          <span className="text-gray-500">
                            {new Date(platform.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-600">수정일:</span>
                          <span className="text-gray-500">
                            {new Date(platform.updated_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        
                        {/* 답변 지침 표시 */}
                        {platform.answer_guide && (
                          <div className="pt-2 border-t">
                            <div className="space-y-2">
                              <span className="font-medium text-gray-600 text-sm">답변 지침:</span>
                              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                  {platform.answer_guide}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
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

      {/* 엑셀 업로드 모달 */}
      <Dialog open={isExcelUploadModalOpen} onOpenChange={setIsExcelUploadModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              광고주 엑셀 업로드
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 엑셀 업로드 컴포넌트 */}
            <ExcelUpload
              agencyId={user?.agency_id || 0}
              onUpload={handleExcelUpload}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
