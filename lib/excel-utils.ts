import * as XLSX from "xlsx"

export interface ExcelClient {
  매장명: string
  사업자등록번호: string
  사장님휴대폰번호: string
  플랫폼: string
  대행사: string
  등록일: string
  메모?: string
}

export interface ExcelAgency {
  대행사명: string
  이메일: string
  연락처: string
  광고주수: number
  가입일: string
  상태: string
}

// 플랫폼 정보까지 포함한 상세 엑셀 다운로드
export const downloadClientsWithPlatformsExcel = async (
  clients: any[], 
  getClientPlatforms: (clientId: number) => Promise<any>,
  filename = "광고주_상세목록"
) => {
  const workbook = XLSX.utils.book_new()

  // 1. 광고주 기본 정보 시트
  const basicData: ExcelClient[] = clients.map((client) => ({
    매장명: client.storeName,
    사업자등록번호: client.businessNumber,
    사장님휴대폰번호: client.ownerPhone,
    플랫폼: client.platforms.join(", "),
    대행사: client.agency,
    등록일: client.registeredAt,
    메모: client.memo || "",
  }))

  const basicWorksheet = XLSX.utils.json_to_sheet(basicData)
  const basicColWidths = [
    { wch: 20 }, // 매장명
    { wch: 15 }, // 사업자등록번호
    { wch: 15 }, // 사장님휴대폰번호
    { wch: 30 }, // 플랫폼
    { wch: 15 }, // 대행사
    { wch: 12 }, // 등록일
    { wch: 30 }, // 메모
  ]
  basicWorksheet["!cols"] = basicColWidths
  XLSX.utils.book_append_sheet(workbook, basicWorksheet, "1. 광고주 기본정보")

  // 2. 플랫폼 상세 정보 수집
  const platformData: any[] = []
  
  for (const client of clients) {
    try {
      const { data: platforms, error } = await getClientPlatforms(client.id)
      
      if (error) {
        console.error(`플랫폼 정보 조회 에러 (클라이언트 ID: ${client.id}):`, error)
      } else if (platforms && platforms.length > 0) {
        platforms.forEach((platform: any) => {
          platformData.push({
            매장명: client.storeName,
            사업자등록번호: client.businessNumber,
            대행사: client.agency,
            플랫폼명: platform.platform_name,
            플랫폼아이디: platform.platform_id || '',
            플랫폼비밀번호: platform.platform_password || '',
            샵아이디: platform.shop_id || '',
            답변지침: platform.answer_guide || '',
            등록일: platform.created_at ? new Date(platform.created_at).toLocaleDateString('ko-KR') : '',
            수정일: platform.updated_at ? new Date(platform.updated_at).toLocaleDateString('ko-KR') : ''
          })
        })
      }
    } catch (error) {
      console.error(`플랫폼 정보 조회 중 예외 발생 (클라이언트 ${client.id}):`, error)
    }
  }

  // 3. 플랫폼 상세 정보 시트
  if (platformData.length > 0) {
    const platformWorksheet = XLSX.utils.json_to_sheet(platformData)
    const platformColWidths = [
      { wch: 20 }, // 매장명
      { wch: 15 }, // 사업자등록번호
      { wch: 15 }, // 대행사
      { wch: 15 }, // 플랫폼명
      { wch: 20 }, // 플랫폼아이디
      { wch: 15 }, // 플랫폼비밀번호
      { wch: 15 }, // 샵아이디
      { wch: 40 }, // 답변지침
      { wch: 12 }, // 등록일
      { wch: 12 }, // 수정일
    ]
    platformWorksheet["!cols"] = platformColWidths
    XLSX.utils.book_append_sheet(workbook, platformWorksheet, "2. 플랫폼 계정정보 [중요]")
  }

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`)
}

// 기존 간단한 엑셀 다운로드 (호환성을 위해 유지)
export const downloadClientsExcel = (clients: any[], filename = "광고주_목록") => {
  const excelData: ExcelClient[] = clients.map((client) => ({
    매장명: client.storeName,
    사업자등록번호: client.businessNumber,
    사장님휴대폰번호: client.ownerPhone,
    플랫폼: client.platforms.join(", "),
    대행사: client.agency,
    등록일: client.registeredAt,
    메모: client.memo || "",
  }))

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "광고주 목록")

  // 컬럼 너비 설정
  const colWidths = [
    { wch: 20 }, // 매장명
    { wch: 15 }, // 사업자등록번호
    { wch: 15 }, // 사장님휴대폰번호
    { wch: 30 }, // 플랫폼
    { wch: 15 }, // 대행사
    { wch: 12 }, // 등록일
    { wch: 30 }, // 메모
  ]
  worksheet["!cols"] = colWidths

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`)
}

export const downloadAgenciesExcel = (agencies: any[], filename = "대행사_목록") => {
  const excelData: ExcelAgency[] = agencies.map((agency) => ({
    대행사명: agency.name,
    이메일: agency.email,
    연락처: agency.phone,
    광고주수: agency.clientCount,
    가입일: agency.registeredAt,
    상태: agency.status,
  }))

  const worksheet = XLSX.utils.json_to_sheet(excelData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "대행사 목록")

  // 컬럼 너비 설정
  const colWidths = [
    { wch: 20 }, // 대행사명
    { wch: 25 }, // 이메일
    { wch: 15 }, // 연락처
    { wch: 10 }, // 광고주수
    { wch: 12 }, // 가입일
    { wch: 10 }, // 상태
  ]
  worksheet["!cols"] = colWidths

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`)
}
