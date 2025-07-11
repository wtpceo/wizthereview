import { google } from 'googleapis'
import { supabase } from './supabase'
import { sendSyncNotification, sendBatchSyncNotification } from './email-service'

// 직접 credentials 정보 사용 (실제 운영 환경에서는 환경 변수 사용 권장)
const credentials = {
  type: "service_account",
  project_id: "powerful-genre-464506-t6",
  private_key_id: "2c00c120a0901a24b61215556e0bee83baaee7f1",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDdk4sUyy11K8X4\ndtY7krAWF6a4NQTb7THA6EfMGufBW1YeoZft8zAEMkd4HdgUen233XlJRhB9r/20\n/XsrfxWhn7tIx8EmIpjEvZX3K2qG20J0Wg2a3MipAhHUNKQC0hUqmijteBZ/XPGo\nIHBMD53Gmq1veZ/yPrlsyqUv7sngV9e/YchXOBOTaKqLQ+XrcQewgXcvsxN/hEFV\nRI++XWa+i0x+fUKq3HouLMra6ks4qQhzwCgTLSSLtWdDX5mKYqOcV6YmeEYZjQAA\nHMKh7E6W8m+DE8UR1LRgbDznJphduoM9LEbEFb6xGIY4xdSe6YiyzplvWBQ+ICTg\nAfByYk9vAgMBAAECggEADCDDIu27Z2ebIUOb6/crpTdBMbb735p8N9i0SViK/pCP\nG65w9Z4d2YpI/YBLWf+Zua0pMi4KwV5shBzAbPvlRWChVyqmiKhUdVGtOjIJqtJT\nMQbW1MxTPWZMGdyRwkfDzyj7UYLaXw6ezuWLpVYmJtSY5qT2cMN8fGxxHeOzmrsK\nEmzZfp1HEN+iXFyMwFyg9KED1g3RA5WrYSih5QYhP+w1MSKtM87SYLIwf0DUjKGA\n1eBInbxxtN5jIM5bqpxWq5FwXReHhykJxQR50WMFBZFFVAdxVyJ9lDph4E9IK8I8\nfoML4+wefkS6/7mp8iGlkhzuuFkvr7OsLLDZ5B9nvQKBgQD06Mqx0IuCcdoLnKSS\n08l0BZzERm3JX4Gf1RarBoaNaNm2dtBpCo8QOi8X87hjeYCp9k4HmaeMuLMV2s6+\nmfGQiKKyPQo0OJm4bE/8CyD5ViWIWxvxpeveVJ1gv8QM6VZVb7nhlqE42ba9o4op\niHGF9cd6Nn4SC9HuEDIf3WrmawKBgQDnnEElVkTTA7M9B+Ri7hGmoeQ5wF4JYTmr\nCk5uqxxT2osr3HX7Sbv7Q48LcrDwJZZVeIx8LY+TkUxrXyiRgZ9h8Un7Eenqh+e8\nO3GbLETgAVj0DUglKkoCQNvytybA87zhTgVU98mh2TKdmat/bTsS63mCThDTo3Qn\nWNsDaGzUDQKBgQCsSuz15QmQTjogOyXIKXgqyBv+NLHdnfPaFpWo4aFc8CthYvrB\nOu1kdBpXVl0clgi/CQjh7eXiaLmMIW+axUAc9xLGI4z/KeZyyLgIT2f2IPWslLP2\n70wdEBfbTW1FzA2xczUoj8iB7x/RD7EOAPAkVsDrqFROq8QXH4uzwRgIWwKBgBut\nuLtVi/QLxSfOAaUw/jsDrdqY+qP0Uof2O1lOaZw7ydX8Cr11Gln0wOuFUU/hrg2Y\n0nEkoLvp6VALlzWMYBe8VjMC+QlmJHOCRxlcOP7sKk1AKRcH7sBGMALZkHAOsMvc\nHxcAZcBJzJq4+p3H1/9y1JqV6bzhE8h//exyVk8hAoGAHSVvT1ek+ydGYkVwpfIv\nN3NvXXLwbCyHHA5UGkRJwRfqn4QjC4efPEfVSPMVN2Aik3/1Gl+QldVK31KPMM6a\n4kuB5YPRz6xgPd+3zp7pJiCgsN/B5MjVHT1MUcWP9K3GeCevEtceCQ+VLFaSxMCp\nqu44t2IZec26NdsDxUGyQSE=\n-----END PRIVATE KEY-----\n",
  client_email: "review-writer@powerful-genre-464506-t6.iam.gserviceaccount.com",
  client_id: "117096835750919803347",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/review-writer%40powerful-genre-464506-t6.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
}

// Google Sheets API 클라이언트 설정
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

export const sheets = google.sheets({ version: 'v4', auth })

// 플랫폼별 시트 이름 매핑
const PLATFORM_SHEET_MAPPING = {
  '네이버플레이스': '네이버 플레이스',
  '배달의민족': '배민',
  '쿠팡이츠': '쿠팡',
  '요기요': '요기요'
}

// 구글 시트 ID는 함수 파라미터로 받아서 사용

// 구글 시트에서 중복 데이터 체크 함수
async function checkDuplicateInSheet(
  spreadsheetId: string,
  sheetName: string,
  storeName: string,
  platformId: string
): Promise<boolean> {
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
  },
  sendNotification: boolean = true
) {
  try {
    const sheetName = PLATFORM_SHEET_MAPPING[platformName as keyof typeof PLATFORM_SHEET_MAPPING]
    
    if (!sheetName) {
      throw new Error(`지원하지 않는 플랫폼입니다: ${platformName}`)
    }

    console.log(`📊 ${sheetName} 시트에 데이터 추가 중...`)

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

    // 데이터 행 추가
    const row = [
      data.storeName,
      data.platformId,
      data.platformPassword,
      data.shopId,
      data.registeredAt || new Date().toISOString().split('T')[0]
    ]

    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:E`,
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
  try {
    // 첫 번째 행 데이터 확인
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A1:E1`
    })

    const headers = response.data.values?.[0]
    
    // 헤더가 없거나 완전하지 않은 경우 추가
    if (!headers || headers.length < 5) {
      const headerRow = ['업체명', '아이디', '비밀번호', '샵아이디', '등록일']
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headerRow]
        }
      })
      
      console.log(`📋 ${sheetName} 시트 헤더 추가 완료`)
    }
  } catch (error: any) {
    console.error(`❌ ${sheetName} 시트 헤더 확인 실패:`, error)
  }
}

// 모든 플랫폼 데이터를 구글 시트에 동기화하는 함수
export async function syncAllPlatformsToSheet(spreadsheetId: string) {
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
      
      for (const platform of clientPlatforms) {
        totalCount++
        
        // 일괄 처리 시에는 개별 이메일 알림 비활성화
        const result = await addPlatformDataToSheet(spreadsheetId, platform.platform_name, {
          storeName: client.store_name,
          platformId: platform.platform_id,
          platformPassword: platform.platform_password,
          shopId: platform.shop_id,
          registeredAt: client.created_at ? client.created_at.split('T')[0] : undefined
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
        registeredAt: client.created_at ? client.created_at.split('T')[0] : undefined
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
  },
  platforms: Array<{
    platform_name: string
    platform_id: string
    platform_password: string
    shop_id: string
  }>
) {
  try {
    console.log(`🔄 새로운 클라이언트 실시간 동기화 시작: ${clientData.store_name}`)
    
    // 환경 변수에서 구글 시트 ID 가져오기 (실제 운영에서는 설정 필요)
    // TODO: 실제 구글 시트 ID로 변경해주세요
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 
      '1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM' // ⚠️ 실제 구글 시트 ID로 변경 필요
    
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
        registeredAt: clientData.created_at ? clientData.created_at.split('T')[0] : undefined
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