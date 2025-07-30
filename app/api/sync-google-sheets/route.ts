import { NextRequest, NextResponse } from 'next/server'
import { syncAllPlatformsToSheet, addClientPlatformsToSheet } from '@/lib/google-sheets'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 구글 시트 동기화 API 호출됨')
    
    // 환경 변수 확인
    console.log('📋 환경 변수 상태:', {
      hasGoogleServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      keyLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0
    })
    
    const body = await request.json()
    const { type, clientId, spreadsheetId } = body

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: '구글 시트 ID를 제공해주세요.' },
        { status: 400 }
      )
    }

    let result

    if (type === 'all') {
      // 모든 플랫폼 데이터 동기화
      console.log('📊 모든 플랫폼 데이터 동기화 시작...')
      result = await syncAllPlatformsToSheet(spreadsheetId)
    } else if (type === 'client' && clientId) {
      // 특정 클라이언트 플랫폼 데이터 동기화
      console.log(`📊 클라이언트 ${clientId} 플랫폼 데이터 동기화 시작...`)
      result = await addClientPlatformsToSheet(spreadsheetId, clientId)
    } else {
      return NextResponse.json(
        { success: false, error: '올바른 type과 clientId를 제공해주세요.' },
        { status: 400 }
      )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || '동기화가 완료되었습니다.'
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('💥 구글 시트 동기화 API 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '동기화 중 오류가 발생했습니다.' 
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
    }
  })
} 