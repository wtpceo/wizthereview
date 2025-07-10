import nodemailer from 'nodemailer'

// 이메일 알림 설정
const EMAIL_CONFIG = {
  // Gmail SMTP 설정 (실제 운영에서는 환경 변수로 관리)
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'ceo@wiztheplanning.com', // Gmail 계정
    pass: process.env.EMAIL_PASS || 'NOT_CONFIGURED'    // Gmail 앱 비밀번호
  }
}

// 알림 받을 이메일 주소 목록 (여러 이메일 지원)
const NOTIFICATION_EMAILS = [
  'ceo@wiztheplanning.com',
  'qpqpqp@wiztheplanning.com',
  'smartwater@wiztheplanning.com'
  // 필요에 따라 더 추가 가능
]

// 이메일 전송 클라이언트 생성
const transporter = nodemailer.createTransport(EMAIL_CONFIG)

// 이메일 전송 함수
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  text?: string
) {
  try {
    // 이메일 설정이 제대로 되어있는지 확인
    if (EMAIL_CONFIG.auth.pass === 'NOT_CONFIGURED') {
      console.log('⚠️ 이메일 설정이 완료되지 않아 이메일 전송을 건너뜁니다.')
      return { success: true, skipped: true, message: '이메일 설정이 완료되지 않음' }
    }

    const mailOptions = {
      from: `"리뷰프로그램 시스템" <${EMAIL_CONFIG.auth.user}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>?/gm, '') // HTML 태그 제거
    }

    console.log('📧 이메일 전송 시작...', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      user: EMAIL_CONFIG.auth.user
    })

    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ 이메일 전송 성공:', info.messageId)
    return { success: true, messageId: info.messageId }

  } catch (error: any) {
    console.error('❌ 이메일 전송 실패:', error)
    return { success: false, error: error.message }
  }
}

// 구글 시트 동기화 완료 알림 이메일
export async function sendSyncNotification(
  clientName: string,
  platformName: string,
  isSuccess: boolean,
  details?: {
    storeName: string
    platformId: string
    shopId: string
    registeredAt: string
    syncedAt: string
  }
) {
  try {
    const subject = isSuccess 
      ? `✅ 구글 시트 동기화 완료 - ${clientName}`
      : `❌ 구글 시트 동기화 실패 - ${clientName}`

    const html = isSuccess ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #16a34a; margin-bottom: 20px;">✅ 구글 시트 동기화 완료</h2>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-left: 4px solid #0ea5e9; margin-bottom: 20px;">
            <h3 style="color: #0369a1; margin-top: 0;">새로운 광고주가 등록되었습니다</h3>
            <p style="margin: 0; color: #0369a1;">시스템에서 자동으로 구글 시트에 동기화되었습니다.</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: #374151; margin-top: 0;">광고주 정보</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280; width: 120px;">업체명:</td>
                <td style="padding: 8px 0; color: #374151;">${details?.storeName || clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">플랫폼:</td>
                <td style="padding: 8px 0; color: #374151;">${platformName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">플랫폼 ID:</td>
                <td style="padding: 8px 0; color: #374151;">${details?.platformId || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">샵 ID:</td>
                <td style="padding: 8px 0; color: #374151;">${details?.shopId || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">등록일:</td>
                <td style="padding: 8px 0; color: #374151;">${details?.registeredAt || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">동기화 시간:</td>
                <td style="padding: 8px 0; color: #374151;">${details?.syncedAt || new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              📊 구글 시트의 <strong>'${getPlatformSheetName(platformName)}'</strong> 탭에서 확인하실 수 있습니다.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              리뷰프로그램 자동 알림 시스템<br>
              ${new Date().toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #dc2626; margin-bottom: 20px;">❌ 구글 시트 동기화 실패</h2>
          
          <div style="background-color: #fef2f2; padding: 20px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin-top: 0;">동기화 중 오류가 발생했습니다</h3>
            <p style="margin: 0; color: #dc2626;">수동으로 확인이 필요합니다.</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: #374151; margin-top: 0;">대상 광고주 정보</h4>
            <p style="margin: 0; color: #374151;">
              <strong>업체명:</strong> ${clientName}<br>
              <strong>플랫폼:</strong> ${platformName}<br>
              <strong>시도 시간:</strong> ${new Date().toLocaleString('ko-KR')}
            </p>
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              🔧 관리자 페이지에서 수동으로 동기화를 다시 시도해주세요.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              리뷰프로그램 자동 알림 시스템<br>
              ${new Date().toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      </div>
    `

    const result = await sendEmail(NOTIFICATION_EMAILS, subject, html)
    
    if (result.success) {
      console.log('✅ 동기화 알림 이메일 전송 성공')
    } else {
      console.error('❌ 동기화 알림 이메일 전송 실패:', result.error)
    }
    
    return result

  } catch (error: any) {
    console.error('❌ 동기화 알림 이메일 생성 실패:', error)
    return { success: false, error: error.message }
  }
}

// 플랫폼 이름을 시트 이름으로 변환
function getPlatformSheetName(platformName: string): string {
  const mapping: { [key: string]: string } = {
    '네이버플레이스': '네이버 플레이스',
    '배달의민족': '배민',
    '쿠팡이츠': '쿠팡',
    '요기요': '요기요'
  }
  return mapping[platformName] || platformName
}

// 일괄 동기화 완료 알림 이메일
export async function sendBatchSyncNotification(
  successCount: number,
  failureCount: number,
  totalCount: number,
  duration: number // 소요 시간 (초)
) {
  try {
    const subject = `📊 구글 시트 일괄 동기화 완료 - 성공: ${successCount}개, 실패: ${failureCount}개`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-bottom: 20px;">📊 구글 시트 일괄 동기화 완료</h2>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-left: 4px solid #0ea5e9; margin-bottom: 20px;">
            <h3 style="color: #0369a1; margin-top: 0;">동기화 결과</h3>
            <p style="margin: 0; color: #0369a1;">전체 ${totalCount}개 항목의 동기화가 완료되었습니다.</p>
          </div>

          <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="flex: 1; background-color: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${successCount}</div>
              <div style="color: #065f46; font-size: 14px;">성공</div>
            </div>
            <div style="flex: 1; background-color: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${failureCount}</div>
              <div style="color: #991b1b; font-size: 14px;">실패</div>
            </div>
            <div style="flex: 1; background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${duration}초</div>
              <div style="color: #4b5563; font-size: 14px;">소요시간</div>
            </div>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="color: #374151; margin-top: 0;">동기화 상세 정보</h4>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
              <li>총 처리 항목: ${totalCount}개</li>
              <li>성공률: ${((successCount / totalCount) * 100).toFixed(1)}%</li>
              <li>동기화 시간: ${new Date().toLocaleString('ko-KR')}</li>
              <li>소요 시간: ${duration}초</li>
            </ul>
          </div>

          ${failureCount > 0 ? `
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                ⚠️ ${failureCount}개의 항목이 동기화에 실패했습니다. 관리자 페이지에서 개별적으로 다시 시도해주세요.
              </p>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              리뷰프로그램 자동 알림 시스템<br>
              ${new Date().toLocaleString('ko-KR')}
            </p>
          </div>
        </div>
      </div>
    `

    const result = await sendEmail(NOTIFICATION_EMAILS, subject, html)
    
    if (result.success) {
      console.log('✅ 일괄 동기화 알림 이메일 전송 성공')
    } else {
      console.error('❌ 일괄 동기화 알림 이메일 전송 실패:', result.error)
    }
    
    return result

  } catch (error: any) {
    console.error('❌ 일괄 동기화 알림 이메일 생성 실패:', error)
    return { success: false, error: error.message }
  }
}

// 알림 이메일 주소 관리 함수들
export function getNotificationEmails(): string[] {
  return [...NOTIFICATION_EMAILS]
}

export function addNotificationEmail(email: string): boolean {
  if (!NOTIFICATION_EMAILS.includes(email)) {
    NOTIFICATION_EMAILS.push(email)
    return true
  }
  return false
}

export function removeNotificationEmail(email: string): boolean {
  const index = NOTIFICATION_EMAILS.indexOf(email)
  if (index > -1) {
    NOTIFICATION_EMAILS.splice(index, 1)
    return true
  }
  return false
} 