import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { syncClientToGoogleSheets } from '@/lib/google-sheets'
import { sendEmailNotification } from '@/lib/email-service'

interface ClientData {
  store_name: string
  naver_id?: string
  naver_password?: string
  naver_shop_id?: string
  baemin_id?: string
  baemin_password?: string
  baemin_shop_id?: string
  coupang_id?: string
  coupang_password?: string
  coupang_shop_id?: string
  yogiyo_id?: string
  yogiyo_password?: string
  yogiyo_shop_id?: string
  ddangyo_id?: string
  ddangyo_password?: string
  ddangyo_shop_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const { agencyId, clients } = await request.json()

    if (!agencyId || !clients || !Array.isArray(clients)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    const supabase = createClient()
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      syncedClients: [] as any[]
    }

    for (const clientData of clients) {
      try {
        // 클라이언트 생성
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            agency_id: agencyId,
            store_name: clientData.store_name,
          })
          .select()
          .single()

        if (clientError) {
          throw new Error(`${clientData.store_name}: ${clientError.message}`)
        }

        // 플랫폼 정보 생성
        const platformsToInsert = []

        // 네이버플레이스
        if (clientData.naver_id) {
          platformsToInsert.push({
            client_id: newClient.id,
            platform_name: '네이버플레이스',
            platform_id: clientData.naver_id,
            platform_password: clientData.naver_password || '',
            shop_id: clientData.naver_shop_id || ''
          })
        }

        // 배달의민족
        if (clientData.baemin_id) {
          platformsToInsert.push({
            client_id: newClient.id,
            platform_name: '배달의민족',
            platform_id: clientData.baemin_id,
            platform_password: clientData.baemin_password || '',
            shop_id: clientData.baemin_shop_id || ''
          })
        }

        // 쿠팡이츠
        if (clientData.coupang_id) {
          platformsToInsert.push({
            client_id: newClient.id,
            platform_name: '쿠팡이츠',
            platform_id: clientData.coupang_id,
            platform_password: clientData.coupang_password || '',
            shop_id: clientData.coupang_shop_id || ''
          })
        }

        // 요기요
        if (clientData.yogiyo_id) {
          platformsToInsert.push({
            client_id: newClient.id,
            platform_name: '요기요',
            platform_id: clientData.yogiyo_id,
            platform_password: clientData.yogiyo_password || '',
            shop_id: clientData.yogiyo_shop_id || ''
          })
        }

        // 땡겨요
        if (clientData.ddangyo_id) {
          platformsToInsert.push({
            client_id: newClient.id,
            platform_name: '땡겨요',
            platform_id: clientData.ddangyo_id,
            platform_password: clientData.ddangyo_password || '',
            shop_id: clientData.ddangyo_shop_id || ''
          })
        }

        if (platformsToInsert.length > 0) {
          const { error: platformError } = await supabase
            .from('client_platforms')
            .insert(platformsToInsert)

          if (platformError) {
            throw new Error(`플랫폼 정보 저장 실패: ${platformError.message}`)
          }
        }

        // 구글 시트 동기화
        try {
          await syncClientToGoogleSheets(newClient.id)
          results.syncedClients.push({
            id: newClient.id,
            store_name: newClient.store_name
          })
        } catch (syncError) {
          console.error('구글 시트 동기화 실패:', syncError)
        }

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(error instanceof Error ? error.message : '알 수 없는 오류')
      }
    }

    // 이메일 알림 발송
    if (results.syncedClients.length > 0) {
      try {
        await sendEmailNotification(
          '광고주 일괄 등록 완료',
          `<h2>광고주 일괄 등록이 완료되었습니다</h2>
          <p>총 ${results.success}개 광고주가 성공적으로 등록되었습니다.</p>
          ${results.failed > 0 ? `<p>${results.failed}개 광고주 등록에 실패했습니다.</p>` : ''}
          <h3>등록된 광고주 목록:</h3>
          <ul>
            ${results.syncedClients.map(client => `<li>${client.store_name}</li>`).join('')}
          </ul>
          ${results.errors.length > 0 ? `
          <h3>오류 내역:</h3>
          <ul>
            ${results.errors.map(error => `<li>${error}</li>`).join('')}
          </ul>
          ` : ''}`
        )
      } catch (emailError) {
        console.error('이메일 발송 실패:', emailError)
      }
    }

    return NextResponse.json({
      message: `총 ${results.success}개 광고주가 등록되었습니다.`,
      results
    })
  } catch (error) {
    console.error('일괄 업로드 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}