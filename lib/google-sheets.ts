import { google } from 'googleapis'
import { supabase } from './supabase'
import { sendSyncNotification, sendBatchSyncNotification } from './email-service'

// Google Sheets API 클라이언트를 동적으로 초기화
let sheets: any = null;

// Google Sheets API 초기화 함수
function initializeGoogleSheets() {
  if (sheets) return sheets;

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  console.log('🔍 Google Sheets 초기화 시도:', {
    hasServiceAccountKey: !!serviceAccountKey,
    keyLength: serviceAccountKey?.length || 0,
    nodeEnv: process.env.NODE_ENV
  });

  if (!serviceAccountKey) {
    console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다.');
    return null;
  }

  try {
    // JSON 문자열을 파싱하고 이스케이프된 개행 문자를 실제 개행 문자로 변환
    const credentials = JSON.parse(serviceAccountKey);
    
    // private_key의 이스케이프된 개행 문자를 실제 개행 문자로 변환
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    
    // Google Sheets API 클라이언트 설정
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API 클라이언트 초기화 성공');
    return sheets;
  } catch (error) {
    console.error('❌ Google Service Account 자격증명 파싱 실패:', error);
    return null;
  }
}

// 각 함수 호출 시 초기화
function getSheets() {
  if (!sheets) {
    sheets = initializeGoogleSheets();
  }
  return sheets;
}

export { getSheets }

// 플랫폼별 시트 이름 매핑
const PLATFORM_SHEET_MAPPING = {
  '네이버플레이스': '네이버 플레이스',
  '배달의민족': '배민',
  '쿠팡이츠': '쿠팡',
  '요기요': '요기요',
  '땡겨요': '땡겨요',
  '배달이음': '배달이음',
  '카카오매장': '카카오매장'
}

// 구글 시트 ID는 함수 파라미터로 받아서 사용

// 구글 시트에서 중복 데이터 체크 함수
async function checkDuplicateInSheet(
  spreadsheetId: string,
  sheetName: string,
  storeName: string,
  platformId: string
): Promise<boolean> {
  const sheets = getSheets();
  if (!sheets) {
    console.warn('⚠️ Google Sheets API가 초기화되지 않았습니다.')
    return false
  }
  
  try {
    console.log(`🔍 ${sheetName} 시트에서 중복 체크 중...`, { storeName, platformId })
    
    // 시트의 모든 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:E`
    })

    const rows = response.data.values || []
    
    // 헤더 행 제외하고 검색
    const dataRows = rows.slice(1)
    
    // 업체명과 플랫폼ID 조합으로 중복 체크
    const isDuplicate = dataRows.some(row => {
      const [sheetStoreName, sheetPlatformId] = row
      return sheetStoreName === storeName && sheetPlatformId === platformId
    })
    
    if (isDuplicate) {
      console.log(`⚠️ 중복 데이터 발견: ${storeName} (${platformId})`)
    } else {
      console.log(`✅ 중복 없음: ${storeName} (${platformId})`)
    }
    
    return isDuplicate
  } catch (error: any) {
    console.error(`❌ ${sheetName} 시트 중복 체크 실패:`, error)
    // 중복 체크 실패 시 안전하게 false 반환 (동기화 진행)
    return false
  }
}

// 특정 플랫폼 데이터를 구글 시트에 추가하는 함수
export async function addPlatformDataToSheet(
  spreadsheetId: string,
  platformName: string,
  data: {
    storeName: string
    platformId: string
    platformPassword: string
    shopId: string
    registeredAt?: string
    ownerPhone?: string
    contractStartDate?: string
    contractPeriod?: string
    contractEndDate?: string
    guide?: string
    memo?: string
  },
  sendNotification: boolean = true
) {
  const sheets = getSheets();
  if (!sheets) {
    console.warn('⚠️ Google Sheets API가 초기화되지 않았습니다.')
    return { success: false, error: 'Google Sheets API가 초기화되지 않았습니다.' }
  }
  
  try {
    const sheetName = PLATFORM_SHEET_MAPPING[platformName as keyof typeof PLATFORM_SHEET_MAPPING]
    
    if (!sheetName) {
      console.error(`❌ 지원하지 않는 플랫폼: ${platformName}`)
      console.error('지원되는 플랫폼:', Object.keys(PLATFORM_SHEET_MAPPING))
      throw new Error(`지원하지 않는 플랫폼입니다: ${platformName}`)
    }

    console.log(`📊 ${sheetName} 시트에 데이터 추가 중...`)
    console.log('플랫폼 매핑:', { platformName, sheetName })
    console.log('전송할 데이터:', {
      storeName: data.storeName,
      platformId: data.platformId,
      ownerPhone: data.ownerPhone,
      guide: data.guide,
      memo: data.memo
    })

    // 헤더 행 확인 및 생성
    await ensureSheetHeaders(spreadsheetId, sheetName)

    // 중복 체크
    const isDuplicate = await checkDuplicateInSheet(
      spreadsheetId,
      sheetName,
      data.storeName,
      data.platformId
    )

    if (isDuplicate) {
      console.log(`⚠️ 중복 데이터 스킵: ${data.storeName} (${data.platformId})`)
      return { 
        success: true, 
        message: '이미 존재하는 데이터입니다.',
        skipped: true 
      }
    }

    // 데이터 행 추가 (헤더 순서와 일치시킴)
    // 헤더: ['업체명', '아이디', '비밀번호', '샵아이디', '등록일', '전화번호', '계약시작일', '계약기간', '계약종료일', '지침', '메모']
    const row = [
      data.storeName,           // 업체명
      data.platformId,          // 아이디
      data.platformPassword,    // 비밀번호
      data.shopId,              // 샵아이디
      data.registeredAt || new Date().toISOString().split('T')[0], // 등록일
      data.ownerPhone || '',    // 전화번호 (연락처 → 전화번호)
      data.contractStartDate || '', // 계약시작일
      data.contractPeriod || '',    // 계약기간
      data.contractEndDate || '',   // 계약종료일
      data.guide || '',         // 지침
      data.memo || ''           // 메모
    ]
    
    console.log('구글 시트에 추가할 행 데이터:', row)

    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:K`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    })

    console.log(`✅ ${sheetName} 시트 업데이트 성공`)
    
    // 이메일 알림 전송 (실시간 동기화 시)
    if (sendNotification) {
      try {
        await sendSyncNotification(
          data.storeName,
          platformName,
          true,
          {
            storeName: data.storeName,
            platformId: data.platformId,
            shopId: data.shopId,
            registeredAt: data.registeredAt || new Date().toISOString().split('T')[0],
            syncedAt: new Date().toLocaleString('ko-KR')
          }
        )
      } catch (emailError) {
        console.error('❌ 이메일 알림 전송 실패:', emailError)
        // 이메일 실패는 치명적이지 않으므로 계속 진행
      }
    }

    return { success: true }

  } catch (error: any) {
    console.error(`❌ ${platformName} 시트 업데이트 실패:`, error)
    
    // 이메일 알림 전송 (실패 시)
    if (sendNotification) {
      try {
        await sendSyncNotification(
          data.storeName,
          platformName,
          false
        )
      } catch (emailError) {
        console.error('❌ 실패 알림 이메일 전송 실패:', emailError)
      }
    }
    
    return { 
      success: false, 
      error: error.message || '시트 업데이트 중 오류가 발생했습니다.' 
    }
  }
}

// 시트 헤더 확인 및 생성 함수
async function ensureSheetHeaders(spreadsheetId: string, sheetName: string) {
  const sheets = getSheets();
  if (!sheets) {
    console.warn('⚠️ Google Sheets API가 초기화되지 않았습니다.')
    return
  }
  
  try {
    console.log(`🔍 ${sheetName} 시트 헤더 확인 중...`)
    
    // 첫 번째 행 데이터 확인
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A1:K1`
    })

    const headers = response.data.values?.[0]
    console.log(`현재 헤더:`, headers)
    
    // 헤더가 없거나 완전하지 않은 경우 추가
    if (!headers || headers.length < 11) {
      const headerRow = ['업체명', '아이디', '비밀번호', '샵아이디', '등록일', '전화번호', '계약시작일', '계약기간', '계약종료일', '지침', '메모']
      
      console.log(`📝 헤더 추가 중:`, headerRow)
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1:K1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headerRow]
        }
      })
      
      console.log(`📋 ${sheetName} 시트 헤더 추가 완료`)
    } else {
      console.log(`✅ ${sheetName} 시트 헤더 이미 존재`)
    }
  } catch (error: any) {
    console.error(`❌ ${sheetName} 시트 헤더 확인 실패:`, error)
    console.error(`시트 이름 확인 필요: ${sheetName}`)
  }
}

// 모든 플랫폼 데이터를 구글 시트에 동기화하는 함수
export async function syncAllPlatformsToSheet(spreadsheetId: string) {
  const sheets = getSheets();
  if (!sheets) {
    console.warn('⚠️ Google Sheets API가 초기화되지 않았습니다.')
    return { success: false, error: 'Google Sheets API가 초기화되지 않았습니다.' }
  }
  
  const startTime = Date.now()
  
  try {
    console.log('🔄 플랫폼 데이터 동기화 시작...')

    // 모든 클라이언트와 플랫폼 데이터 조회
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        *,
        agency:agencies(name),
        platforms:client_platforms(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`데이터 조회 실패: ${error.message}`)
    }

    if (!clients || clients.length === 0) {
      console.log('ℹ️ 동기화할 데이터가 없습니다.')
      return { success: true, message: '동기화할 데이터가 없습니다.' }
    }

    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    let totalCount = 0

    // 각 클라이언트의 플랫폼 정보를 순회하며 구글 시트에 추가
    for (const client of clients) {
      const clientPlatforms = client.platforms || []
      
      console.log(`👤 클라이언트: ${client.store_name}, 플랫폼 수: ${clientPlatforms.length}`)
      
      for (const platform of clientPlatforms) {
        totalCount++
        
        console.log(`📱 플랫폼 처리 중: ${platform.platform_name}`)
        
        // 일괄 처리 시에는 개별 이메일 알림 비활성화
        const result = await addPlatformDataToSheet(spreadsheetId, platform.platform_name, {
          storeName: client.store_name,
          platformId: platform.platform_id,
          platformPassword: platform.platform_password,
          shopId: platform.shop_id,
          registeredAt: client.created_at ? client.created_at.split('T')[0] : undefined,
          ownerPhone: client.owner_phone,
          contractStartDate: client.contract_start_date,
          contractPeriod: client.contract_period,
          contractEndDate: client.contract_end_date,
          guide: client.guide,
          memo: client.memo
        }, false) // 이메일 알림 비활성화

        if (result.success) {
          if (result.skipped) {
            skippedCount++
          } else {
            successCount++
          }
        } else {
          errorCount++
        }

        // API 호출 제한을 위한 짧은 지연
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log(`🎉 동기화 완료: 성공 ${successCount}개, 중복 스킵 ${skippedCount}개, 실패 ${errorCount}개`)
    
    // 일괄 동기화 완료 이메일 전송
    try {
      await sendBatchSyncNotification(
        successCount,
        errorCount,
        totalCount,
        duration
      )
    } catch (emailError) {
      console.error('❌ 일괄 동기화 알림 이메일 전송 실패:', emailError)
    }
    
    return { 
      success: true, 
      message: `동기화 완료: 성공 ${successCount}개, 중복 스킵 ${skippedCount}개, 실패 ${errorCount}개 (${duration}초 소요)` 
    }

  } catch (error: any) {
    console.error('❌ 플랫폼 데이터 동기화 실패:', error)
    return { 
      success: false, 
      error: error.message || '동기화 중 오류가 발생했습니다.' 
    }
  }
}

// 특정 클라이언트의 플랫폼 데이터를 구글 시트에 추가하는 함수
export async function addClientPlatformsToSheet(spreadsheetId: string, clientId: number) {
  const sheets = getSheets();
  if (!sheets) {
    console.warn('⚠️ Google Sheets API가 초기화되지 않았습니다.')
    return { success: false, error: 'Google Sheets API가 초기화되지 않았습니다.' }
  }
  
  try {
    console.log(`🔄 클라이언트 ${clientId} 플랫폼 데이터 동기화 시작...`)

    // 특정 클라이언트와 플랫폼 데이터 조회
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        agency:agencies(name),
        platforms:client_platforms(*)
      `)
      .eq('id', clientId)
      .single()

    if (error) {
      throw new Error(`클라이언트 데이터 조회 실패: ${error.message}`)
    }

    if (!client || !client.platforms || client.platforms.length === 0) {
      console.log('ℹ️ 동기화할 플랫폼 데이터가 없습니다.')
      return { success: true, message: '동기화할 플랫폼 데이터가 없습니다.' }
    }

    let successCount = 0
    let errorCount = 0

    // 각 플랫폼 정보를 순회하며 구글 시트에 추가
    for (const platform of client.platforms) {
      const result = await addPlatformDataToSheet(spreadsheetId, platform.platform_name, {
        storeName: client.store_name,
        platformId: platform.platform_id,
        platformPassword: platform.platform_password,
        shopId: platform.shop_id,
        registeredAt: client.created_at ? client.created_at.split('T')[0] : undefined,
        ownerPhone: client.owner_phone,
        contractStartDate: client.contract_start_date,
        contractPeriod: client.contract_period,
        contractEndDate: client.contract_end_date,
        guide: client.guide,
        memo: client.memo
      }, true) // 개별 클라이언트 동기화 시에는 이메일 알림 활성화

      if (result.success) {
        successCount++
      } else {
        errorCount++
      }

      // API 호출 제한을 위한 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`🎉 클라이언트 ${clientId} 동기화 완료: 성공 ${successCount}개, 실패 ${errorCount}개`)
    
    return { 
      success: true, 
      message: `동기화 완료: 성공 ${successCount}개, 실패 ${errorCount}개` 
    }

  } catch (error: any) {
    console.error(`❌ 클라이언트 ${clientId} 플랫폼 데이터 동기화 실패:`, error)
    return { 
      success: false, 
      error: error.message || '동기화 중 오류가 발생했습니다.' 
    }
  }
}

// 새로운 클라이언트 등록 시 실시간 동기화 함수
export async function syncNewClientToSheet(
  clientData: {
    id: number
    store_name: string
    created_at: string
    owner_phone?: string
    contract_start_date?: string
    contract_period?: string
    contract_end_date?: string
    guide?: string
    memo?: string
  },
  platforms: Array<{
    platform_name: string
    platform_id: string
    platform_password: string
    shop_id: string
  }>
) {
  const sheets = getSheets();
  if (!sheets) {
    console.warn('⚠️ Google Sheets API가 초기화되지 않았습니다.')
    return { success: false, error: 'Google Sheets API가 초기화되지 않았습니다.' }
  }
  
  try {
    console.log(`🔄 새로운 클라이언트 실시간 동기화 시작: ${clientData.store_name}`)
    
    // 환경 변수에서 구글 시트 ID 가져오기
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID 환경 변수가 설정되지 않았습니다.');
    }
    
    console.log('📊 사용할 스프레드시트 ID:', spreadsheetId.substring(0, 10) + '...')
    
    if (!spreadsheetId || spreadsheetId.includes('PUT_YOUR_') || spreadsheetId.includes('your_') || spreadsheetId.includes('임시')) {
      console.warn('⚠️ 구글 시트 ID가 올바르게 설정되지 않음')
      console.warn('⚠️ 현재 설정된 ID:', spreadsheetId)
      console.warn('⚠️ 해결 방법:')
      console.warn('   1. 환경 변수 GOOGLE_SHEETS_SPREADSHEET_ID 설정')
      console.warn('   2. 또는 lib/google-sheets.ts 파일에서 실제 시트 ID로 변경')
      return { success: false, message: '구글 시트 ID가 올바르게 설정되지 않았습니다. 콘솔 로그를 확인하세요.' }
    }

    if (!platforms || platforms.length === 0) {
      console.log('ℹ️ 동기화할 플랫폼 정보가 없습니다.')
      return { success: true, message: '동기화할 플랫폼 정보가 없습니다.' }
    }

    let successCount = 0
    let errorCount = 0

    // 각 플랫폼 정보를 순회하며 구글 시트에 추가
    for (const platform of platforms) {
      const result = await addPlatformDataToSheet(spreadsheetId, platform.platform_name, {
        storeName: clientData.store_name,
        platformId: platform.platform_id,
        platformPassword: platform.platform_password,
        shopId: platform.shop_id,
        registeredAt: clientData.created_at ? clientData.created_at.split('T')[0] : undefined,
        ownerPhone: clientData.owner_phone,
        contractStartDate: clientData.contract_start_date,
        contractPeriod: clientData.contract_period,
        contractEndDate: clientData.contract_end_date,
        guide: clientData.guide,
        memo: clientData.memo
      }, true) // 실시간 동기화 시에는 이메일 알림 활성화

      if (result.success) {
        successCount++
      } else {
        errorCount++
      }

      // API 호출 제한을 위한 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`🎉 실시간 동기화 완료: 성공 ${successCount}개, 실패 ${errorCount}개`)
    
    return { 
      success: true, 
      message: `실시간 동기화 완료: 성공 ${successCount}개, 실패 ${errorCount}개` 
    }

  } catch (error: any) {
    console.error('❌ 실시간 동기화 실패:', error)
    return { 
      success: false, 
      error: error.message || '실시간 동기화 중 오류가 발생했습니다.' 
    }
  }
} 