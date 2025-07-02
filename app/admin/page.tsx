"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Building2, Users, TrendingUp, Calendar, Eye, Edit, Trash2, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { downloadClientsExcel, downloadAgenciesExcel } from "@/lib/excel-utils"

// 임시 데이터 - 대행사 정보
const agencies = [
  {
    id: 1,
    name: "ABC 광고대행사",
    email: "abc@agency.com",
    phone: "02-1234-5678",
    clientCount: 15,
    registeredAt: "2023-12-01",
    status: "활성",
  },
  {
    id: 2,
    name: "XYZ 마케팅",
    email: "xyz@marketing.com",
    phone: "02-2345-6789",
    clientCount: 8,
    registeredAt: "2023-11-15",
    status: "활성",
  },
  {
    id: 3,
    name: "123 디지털",
    email: "digital@123.com",
    phone: "02-3456-7890",
    clientCount: 3,
    registeredAt: "2024-01-10",
    status: "대기",
  },
]

// 임시 데이터 - 모든 광고주 정보
const allClients = [
  {
    id: 1,
    storeName: "맛있는 치킨집",
    businessNumber: "123-45-67890",
    ownerPhone: "010-1234-5678",
    platforms: ["네이버플레이스", "배달의민족", "쿠팡이츠"],
    registeredAt: "2024-01-15",
    agency: "ABC 광고대행사",
    agencyId: 1,
  },
  {
    id: 2,
    storeName: "행복한 카페",
    businessNumber: "234-56-78901",
    ownerPhone: "010-2345-6789",
    platforms: ["네이버플레이스", "배달의민족", "요기요", "땡겨요", "카카오매장"],
    registeredAt: "2024-01-14",
    agency: "XYZ 마케팅",
    agencyId: 2,
  },
  {
    id: 3,
    storeName: "신선한 마트",
    businessNumber: "345-67-89012",
    ownerPhone: "010-3456-7890",
    platforms: ["네이버플레이스", "쿠팡이츠"],
    registeredAt: "2024-01-13",
    agency: "ABC 광고대행사",
    agencyId: 1,
  },
  {
    id: 4,
    storeName: "달콤한 베이커리",
    businessNumber: "456-78-90123",
    ownerPhone: "010-4567-8901",
    platforms: ["네이버플레이스", "배달의민족"],
    registeredAt: "2024-01-12",
    agency: "XYZ 마케팅",
    agencyId: 2,
  },
]

export default function AdminPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAgency, setSelectedAgency] = useState("전체")
  const [filteredClients, setFilteredClients] = useState(allClients)
  const [selectedAgencyForView, setSelectedAgencyForView] = useState<number | null>(null)
  const [isAgencyClientsDialogOpen, setIsAgencyClientsDialogOpen] = useState(false)

  // 통계 계산
  const totalAgencies = agencies.length
  const activeAgencies = agencies.filter((a) => a.status === "활성").length
  const totalClients = allClients.length
  const totalPlatforms = allClients.reduce((sum, client) => sum + client.platforms.length, 0)

  const handleSearch = () => {
    let filtered = allClients

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.businessNumber.includes(searchTerm) ||
          client.ownerPhone.includes(searchTerm) ||
          client.agency.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedAgency !== "전체") {
      filtered = filtered.filter((client) => client.agency === selectedAgency)
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
    return allClients.filter((client) => client.agencyId === agencyId)
  }

  const handleViewAgencyClients = (agencyId: number) => {
    console.log("Viewing clients for agency:", agencyId)
    setSelectedAgencyForView(agencyId)
    setIsAgencyClientsDialogOpen(true)
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
            <div className="text-2xl font-bold">{(totalPlatforms / totalClients).toFixed(1)}</div>
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
              <Button variant="outline" onClick={handleDownloadAgenciesExcel}>
                <Download className="h-4 w-4 mr-2" />
                엑셀 다운로드
              </Button>
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
                        <Badge variant={agency.status === "활성" ? "default" : "secondary"}>{agency.status}</Badge>
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
    </div>
  )
}
