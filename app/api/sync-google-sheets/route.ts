import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { supabase } from '@/lib/supabase'
import { sendBatchSyncNotification } from '@/lib/email-service'

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

// Google Sheets API 초기화 (API 라우트에서 직접 처리)
function getGoogleSheets() {
  console.log('🔍 API Route에서 Google Sheets 초기화 시도');
  console.log('🔑 환경 변수 확인:', {
    hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length
  });

  try {
    let credentials;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      // 환경 변수에서 자격증명 가져오기
      console.log('✅ 환경 변수에서 자격증명 로드');
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } else {
      // 하드코딩된 자격증명 사용 (개발 용도)
      console.log('⚠️ 환경 변수 없음 - 하드코딩된 자격증명 사용');
      credentials = {
        "type": "service_account",
        "project_id": "powerful-genre-464506-t6",
        "private_key_id": "2c00c120a0901a24b6121555e0bee83baee7f1",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDdk4sUyy11K8X4\ndtY7krAWF6a4NQTb7THA6EfMGufBW1YeoZft8zAEMkd4HdgUen233XlJRhB9r/20\n/XsrfxWhn7tIx8EmIpjEvZX3K2qG20J0Wg2a3MipAhHUNKQC0hUqmijteB/XPGo\nIHBMD53Gmq1veZ/yPrlsyqUv7sngV9e/YchXOBOTaKqLQ+XrcQewgXcvsxN/hEFV\nRI++XWa+i0x+fUKq3HouLMra6ks4qQhzwCgTLSSLtWdDX5mKYqOcV6YmeEYZjQAA\nHMKh7E6W8m+DE8UR1LRgbDznJphduoM9LEbEFb6xGIY4xdSe6YiyzplvWBQ+ICTg\nAfByYk9vAgMBAAECggEADCDDIu27Z2ebIUOb6/crpTdBMbb735p8N9i0SVi/pCP\nG65w9Z4d2YpI/YBLWf+Zua0pMi4KwV5shBzAbPvlRWChVyqmiKhUdVGtOjIJqtJT\nMQbW1MxTPWZMGdyRwkfDzyj7UYLaXw6ezuWLpVYmJtSY5qT2cMN8fGxxHeOzmrsK\nEmzZfp1HEN+iXFyMwFyg9KED1g3RA5WrYSih5QYhP+w1MSKtM87SYLIwf0DUjKGA\n1eBInbxxtN5jIM5bqpxWq5FwXReHhykJxQR50WMFBZFFVAdxVyJ9lDph4E9IK8I8\nfoML4+wefkS6/7mp8iGlkhzuuFkvr7OsLLDZ5B9nvQKBgQD06Mqx0IuCcdoLnKSS\n08l0BZzERm3JX4Gf1RarBoaNaNm2dtBpCo8QOi8X87hjeYCp9k4HmaeMuLMV2s6+\nmfGQiKKyPQo0OJm4bE/8CyD5ViWIWxvxpeveVJ1gv8QM6VZVb7nhlqE42ba9o4or\niHGF9cd6Nn4SC9HuEDIf3WrmawKBgQDnnEElVkTTA7M9B+Ri7hGmoeQ5wF4JYTmr\nCk5uqxxT2osr3HX7Sbv7Q48LcrDwJZZVeIx8LY+TkUxrXyiRgZ9h8Un7Eenqh+e8\nO3GbLETgAVj0DUglKkoCQNvytybA87zhTgVU98mh2TKdmat/bTsS63mCThDTo3Qn\nWNsDaGzUDQKBgQCsSuz15QmQTjogOyXIKXgqyBv+NLHdnfPaFpWo4aFc8CthYvrB\nOu1kdBpXVl0clgi/CQjh7eXiaLmMIV+axUAc9xLGI4z/KeZyyLgIT2f2IPWslLP2\n70wdEBfbTW1FzA2xczUoj8iB7x/RD7EOAPAkVsDrqFROq8QXH4uzwRgIWwKBgBut\nuLtVi/QLxSfOAaUw/jsDrdqY+qP0Uof2O1lOaZw7ydX8Cr11Gln0wOuFUU/hrg2Y\n0nEkoLvp6VALlzWMYBe8VjMC+QlmJHOCRxlcOP7sKk1AKRcH7sBGMALZkHAOsMvc\nHxcAZcBJzJq4+p3H1/9y1JqV6bzhE8h//exyVk8hAoGAHSVvT1ek+ydGYkVwpfIv\nN3NvXXLwbCyHHA5UGkRJwRfqn4QjC4efPEfVSPMVN2Aik3/1Gl+QldVK31KPMM6a\n4kuB5YPRz6xgPd+3zp7pJiCgsN/B5MjVHT1MUcWP9K3GeCevEtceCQ+VLFaSxMCp\nqu44t2IZec26NdsDxUGyQSE=\n-----END PRIVATE KEY-----\n",
        "client_email": "review-writer@powerful-genre-464506-t6.iam.gserviceaccount.com",
        "client_id": "117096835750919803347",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/review-writer%40powerful-genre-464506-t6.iam.gserviceaccount.com",
        "universe_domain": "googleapis.com"
      };
    }
    
    console.log('📄 자격증명 파싱 성공:', {
      type: credentials.type,
      project_id: credentials.project_id,
      client_email: credentials.client_email
    });
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets 객체 생성 성공');
    
    return sheets;
  } catch (error: any) {
    console.error('❌ Google Service Account 자격증명 초기화 실패:', error);
    console.error('오류 상세:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}

// 구글 시트에서 중복 데이터 체크
async function checkDuplicateInSheet(
  sheets: any,
  spreadsheetId: string,
  sheetName: string,
  storeName: string,
  platformId: string
): Promise<boolean> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A:E`
    })

    const rows = response.data.values || []
    const dataRows = rows.slice(1)
    
    return dataRows.some(row => {
      const [sheetStoreName, sheetPlatformId] = row
      return sheetStoreName === storeName && sheetPlatformId === platformId
    })
  } catch (error) {
    console.error(`❌ ${sheetName} 시트 중복 체크 실패:`, error)
    return false
  }
}

// 시트 헤더 확인 및 생성
async function ensureSheetHeaders(sheets: any, spreadsheetId: string, sheetName: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${sheetName}!A1:K1`
    })

    const headers = response.data.values?.[0]
    
    if (!headers || headers.length < 11) {
      const headerRow = ['업체명', '아이디', '비밀번호', '샵아이디', '등록일', '전화번호', '계약시작일', '계약기간', '계약종료일', '지침', '메모']
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetName}!A1:K1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headerRow]
        }
      })
    }
  } catch (error) {
    console.error(`❌ ${sheetName} 시트 헤더 확인 실패:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 구글 시트 동기화 API 호출됨')
    console.log('📋 Request headers:', request.headers)
    
    const sheets = getGoogleSheets();
    if (!sheets) {
      console.error('❌ Google Sheets API 초기화 실패 - sheets 객체가 null입니다')
      return NextResponse.json(
        { success: false, error: 'Google Sheets API가 초기화되지 않았습니다. 환경 변수를 확인하세요.' },
        { status: 500 }
      )
    }
    
    console.log('✅ Google Sheets API 초기화 성공')
    
    const body = await request.json()
    const { type, clientId, spreadsheetId } = body

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: '구글 시트 ID를 제공해주세요.' },
        { status: 400 }
      )
    }

    if (type === 'all') {
      // 모든 플랫폼 데이터 동기화
      console.log('📊 모든 플랫폼 데이터 동기화 시작...')
      
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
        return NextResponse.json({
          success: true,
          message: '동기화할 데이터가 없습니다.'
        })
      }

      let successCount = 0
      let errorCount = 0
      let skippedCount = 0
      const startTime = Date.now()

      for (const client of clients) {
        const clientPlatforms = client.platforms || []
        
        for (const platform of clientPlatforms) {
          const sheetName = PLATFORM_SHEET_MAPPING[platform.platform_name as keyof typeof PLATFORM_SHEET_MAPPING]
          
          if (!sheetName) {
            console.error(`❌ 지원하지 않는 플랫폼: ${platform.platform_name}`)
            errorCount++
            continue
          }

          try {
            // 헤더 확인
            await ensureSheetHeaders(sheets, spreadsheetId, sheetName)

            // 중복 체크
            const isDuplicate = await checkDuplicateInSheet(
              sheets,
              spreadsheetId,
              sheetName,
              client.store_name,
              platform.platform_id
            )

            if (isDuplicate) {
              skippedCount++
              continue
            }

            // 데이터 추가
            const row = [
              client.store_name,
              platform.platform_id,
              platform.platform_password,
              platform.shop_id,
              client.created_at ? client.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              client.owner_phone || '',
              client.contract_start_date || '',
              client.contract_period || '',
              client.contract_end_date || '',
              client.guide || '',
              client.memo || ''
            ]

            await sheets.spreadsheets.values.append({
              spreadsheetId: spreadsheetId,
              range: `${sheetName}!A:K`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [row]
              }
            })

            successCount++
          } catch (error) {
            console.error(`❌ ${platform.platform_name} 시트 업데이트 실패:`, error)
            errorCount++
          }

          // API 호출 제한을 위한 짧은 지연
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const endTime = Date.now()
      const duration = Math.round((endTime - startTime) / 1000)

      // 일괄 동기화 완료 이메일 전송
      try {
        await sendBatchSyncNotification(
          successCount,
          errorCount,
          successCount + errorCount + skippedCount,
          duration
        )
      } catch (emailError) {
        console.error('❌ 일괄 동기화 알림 이메일 전송 실패:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: `동기화 완료: 성공 ${successCount}개, 중복 스킵 ${skippedCount}개, 실패 ${errorCount}개 (${duration}초 소요)`
      })
    } else {
      return NextResponse.json(
        { success: false, error: '올바른 type을 제공해주세요.' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('💥 구글 시트 동기화 API 오류:', error)
    console.error('오류 스택:', error.stack)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '동기화 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// 테스트용 GET 엔드포인트
export async function GET() {
  return NextResponse.json({
    message: '구글 시트 동기화 API가 정상적으로 동작하고 있습니다.',
    endpoints: {
      POST: {
        description: '구글 시트 동기화 실행',
        body: {
          type: 'all | client',
          clientId: 'number (type이 client일 때 필수)',
          spreadsheetId: 'string (필수)'
        }
      }
    },
    env: {
      hasGoogleServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasGoogleSheetsSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    }
  })
}