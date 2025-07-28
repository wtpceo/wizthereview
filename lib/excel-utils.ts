import * as XLSX from "xlsx"

export interface ExcelClient {
  매장명: string
  사업자등록번호: string
  사장님휴대폰번호: string
  플랫폼: string
  대행사: string
  등록일: string
  메모?: string
  지침?: string
  서비스?: string
  계약개월수: number
  계약시작일?: string
  계약종료일?: string
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
  getClientFiles?: (clientId: number) => Promise<any>,
  filename = "광고주_상세목록"
) => {
  try {
    const workbook = XLSX.utils.book_new()
    
    console.log('📊 엑셀 다운로드 시작:', {
      총_광고주수: clients.length,
      파일명: filename
    })

    // 1. 광고주 기본 정보 시트
    const basicData: ExcelClient[] = clients.map((client) => ({
      매장명: client.storeName,
      사업자등록번호: client.businessNumber,
      사장님휴대폰번호: client.ownerPhone,
      플랫폼: client.platforms.join(", "),
      대행사: client.agency,
      등록일: client.registeredAt,
      메모: client.memo || "",
      지침: client.guide || "",
      서비스: client.service || "",
      계약개월수: client.contractMonths || 12,
      계약시작일: client.contractStartDate ? new Date(client.contractStartDate).toLocaleDateString('ko-KR') : "",
      계약종료일: client.contractEndDate ? new Date(client.contractEndDate).toLocaleDateString('ko-KR') : "",
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
      { wch: 25 }, // 지침
      { wch: 25 }, // 서비스
      { wch: 12 }, // 계약개월수
      { wch: 12 }, // 계약시작일
      { wch: 12 }, // 계약종료일
    ]
    basicWorksheet["!cols"] = basicColWidths
    XLSX.utils.book_append_sheet(workbook, basicWorksheet, "1. 광고주 기본정보")

    // 2. 플랫폼 상세 정보 수집 - 개선된 에러 처리
    const platformData: any[] = []
    const fileData: any[] = []
    let successCount = 0
    let failureCount = 0
    
    console.log('🔄 플랫폼 및 파일 정보 수집 시작...')
    
    for (const client of clients) {
      try {
        console.log(`🔍 ${client.storeName}(ID: ${client.id}) 플랫폼 정보 조회 중...`)
        
        const result = await getClientPlatforms(client.id)
        
        if (result.error) {
          console.error(`❌ ${client.storeName} 플랫폼 정보 조회 실패:`, result.error)
          failureCount++
          
          // 에러가 있어도 기본 정보라도 추가 (플랫폼 정보 없이)
          platformData.push({
            매장명: client.storeName,
            사업자등록번호: client.businessNumber,
            대행사: client.agency,
            플랫폼명: '정보 조회 실패',
            플랫폼아이디: '-',
            플랫폼비밀번호: '-',
            샵아이디: '-',
            답변지침: '-',
            등록일: '-',
            수정일: '-',
            상태: '조회 실패'
          })
        } else if (result.data && result.data.length > 0) {
          console.log(`✅ ${client.storeName} 플랫폼 정보 조회 성공: ${result.data.length}개`)
          successCount++
          
          result.data.forEach((platform: any) => {
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
              수정일: platform.updated_at ? new Date(platform.updated_at).toLocaleDateString('ko-KR') : '',
              상태: '정상'
            })
          })
        } else {
          console.log(`ℹ️ ${client.storeName} 플랫폼 정보 없음`)
          
          // 플랫폼 정보가 없는 경우도 표시
          platformData.push({
            매장명: client.storeName,
            사업자등록번호: client.businessNumber,
            대행사: client.agency,
            플랫폼명: '등록된 플랫폼 없음',
            플랫폼아이디: '-',
            플랫폼비밀번호: '-',
            샵아이디: '-',
            답변지침: '-',
            등록일: '-',
            수정일: '-',
            상태: '플랫폼 미등록'
          })
        }
              } catch (error) {
          console.error(`💥 ${client.storeName} 플랫폼 정보 조회 중 예외 발생:`, error)
          failureCount++
          
          // 예외가 발생해도 기본 정보는 추가
          platformData.push({
            매장명: client.storeName,
            사업자등록번호: client.businessNumber,
            대행사: client.agency,
            플랫폼명: '조회 오류',
            플랫폼아이디: '-',
            플랫폼비밀번호: '-',
            샵아이디: '-',
            답변지침: '-',
            등록일: '-',
            수정일: '-',
            상태: '시스템 오류'
          })
        }

        // 파일 정보 수집 (getClientFiles가 제공된 경우에만)
        if (getClientFiles) {
          try {
            console.log(`📁 ${client.storeName}(ID: ${client.id}) 파일 정보 조회 중...`)
            
            const fileResult = await getClientFiles(client.id)
            
            if (fileResult.error) {
              console.error(`❌ ${client.storeName} 파일 정보 조회 실패:`, fileResult.error)
              
              // 파일 정보 조회 실패해도 기본 정보 추가
              fileData.push({
                매장명: client.storeName,
                사업자등록번호: client.businessNumber,
                대행사: client.agency,
                파일타입: '조회 실패',
                파일명: '-',
                파일크기: '-',
                업로드일: '-',
                상태: '조회 실패'
              })
            } else if (fileResult.data && fileResult.data.length > 0) {
              console.log(`✅ ${client.storeName} 파일 정보 조회 성공: ${fileResult.data.length}개`)
              
              fileResult.data.forEach((file: any) => {
                const fileTypeLabels: {[key: string]: string} = {
                  'id_card': '신분증',
                  'contract': '계약서',
                  'cms_application': 'CMS 신청서'
                }
                
                fileData.push({
                  매장명: client.storeName,
                  사업자등록번호: client.businessNumber,
                  대행사: client.agency,
                  파일타입: fileTypeLabels[file.file_type] || file.file_type,
                  파일명: file.file_name || '',
                  파일크기: file.file_size ? `${(file.file_size / 1024).toFixed(1)}KB` : '',
                  업로드일: file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString('ko-KR') : '',
                  상태: '정상'
                })
              })
            } else {
              console.log(`ℹ️ ${client.storeName} 파일 정보 없음`)
              
              // 파일이 없는 경우도 표시
              fileData.push({
                매장명: client.storeName,
                사업자등록번호: client.businessNumber,
                대행사: client.agency,
                파일타입: '파일 없음',
                파일명: '-',
                파일크기: '-',
                업로드일: '-',
                상태: '파일 미업로드'
              })
            }
          } catch (error) {
            console.error(`💥 ${client.storeName} 파일 정보 조회 중 예외 발생:`, error)
            
            // 예외가 발생해도 기본 정보 추가
            fileData.push({
              매장명: client.storeName,
              사업자등록번호: client.businessNumber,
              대행사: client.agency,
              파일타입: '조회 오류',
              파일명: '-',
              파일크기: '-',
              업로드일: '-',
              상태: '시스템 오류'
            })
          }
        }
      }

    console.log('📊 플랫폼 정보 수집 완료:', {
      성공: successCount,
      실패: failureCount,
      총_플랫폼수: platformData.length
    })

    // 3. 플랫폼 상세 정보 시트 생성
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
      { wch: 12 }, // 상태
    ]
    platformWorksheet["!cols"] = platformColWidths
    XLSX.utils.book_append_sheet(workbook, platformWorksheet, "2. 플랫폼 계정정보")

    // 4. 파일 정보 시트 추가 (파일 정보가 있는 경우만)
    if (getClientFiles && fileData.length > 0) {
      console.log('📄 파일 정보 시트 생성 중...')
      
      const fileWorksheet = XLSX.utils.json_to_sheet(fileData)
      const fileColWidths = [
        { wch: 20 }, // 매장명
        { wch: 15 }, // 사업자등록번호
        { wch: 15 }, // 대행사
        { wch: 15 }, // 파일타입
        { wch: 30 }, // 파일명
        { wch: 10 }, // 파일크기
        { wch: 12 }, // 업로드일
        { wch: 12 }, // 상태
      ]
      fileWorksheet["!cols"] = fileColWidths
      XLSX.utils.book_append_sheet(workbook, fileWorksheet, "3. 파일 정보")
      
      console.log('✅ 파일 정보 시트 생성 완료:', fileData.length, '개')
    }

    // 5. 요약 정보 시트 추가
    const summaryData = [
      { 구분: '총 광고주 수', 값: clients.length },
      { 구분: '플랫폼 정보 조회 성공', 값: successCount },
      { 구분: '플랫폼 정보 조회 실패', 값: failureCount },
      { 구분: '총 플랫폼 계정 수', 값: platformData.filter(p => p.상태 === '정상').length },
      { 구분: '파일 정보 포함', 값: getClientFiles ? '예' : '아니오' },
      { 구분: '총 파일 수', 값: getClientFiles ? fileData.filter(f => f.상태 === '정상').length : 0 },
      { 구분: '다운로드 일시', 값: new Date().toLocaleString('ko-KR') }
    ]
    
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
    const summaryColWidths = [
      { wch: 25 }, // 구분
      { wch: 20 }, // 값
    ]
    summaryWorksheet["!cols"] = summaryColWidths
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "0. 다운로드 요약")

    // 5. 파일 다운로드
    const finalFilename = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(workbook, finalFilename)
    
    console.log('✅ 엑셀 다운로드 성공:', finalFilename)
    
    // 성공 메시지 표시 (사용자 피드백용)
    if (failureCount > 0) {
      console.warn(`⚠️ 일부 플랫폼 정보 조회 실패 (${failureCount}개)`)
    }
    
    return {
      success: true,
      filename: finalFilename,
      summary: {
        총_광고주수: clients.length,
        플랫폼_조회_성공: successCount,
        플랫폼_조회_실패: failureCount,
        총_플랫폼수: platformData.length
      }
    }
  } catch (error) {
    console.error('❌ 엑셀 다운로드 중 치명적 오류:', error)
    throw error
  }
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
    지침: client.guide || "",
    서비스: client.service || "",
    계약개월수: client.contractMonths || 12,
    계약시작일: client.contractStartDate ? new Date(client.contractStartDate).toLocaleDateString('ko-KR') : "",
    계약종료일: client.contractEndDate ? new Date(client.contractEndDate).toLocaleDateString('ko-KR') : "",
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
    { wch: 25 }, // 지침
    { wch: 25 }, // 서비스
    { wch: 12 }, // 계약개월수
    { wch: 12 }, // 계약시작일
    { wch: 12 }, // 계약종료일
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
