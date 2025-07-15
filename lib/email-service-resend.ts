import { Resend } from 'resend';

// Resend API 키 설정 (무료 플랜으로도 충분)
const resend = new Resend(process.env.RESEND_API_KEY || 'not-configured');

// 알림 받을 이메일 주소
const NOTIFICATION_EMAILS = [
  'ceo@wiztheplanning.com',
  'qpqpqp@wiztheplanning.com',
  'smartwater@wiztheplanning.com'
];

export async function sendEmailWithResend(
  subject: string,
  html: string
) {
  try {
    // API 키가 설정되지 않은 경우
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend API 키가 설정되지 않았습니다.');
      console.log('👉 https://resend.com 에서 무료 계정을 만들고 API 키를 받으세요.');
      return { success: false, error: 'Resend API 키가 설정되지 않음' };
    }

    const { data, error } = await resend.emails.send({
      from: '리뷰프로그램 <onboarding@resend.dev>', // 무료 플랜에서는 이 주소만 사용 가능
      to: NOTIFICATION_EMAILS,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('❌ Resend 이메일 발송 실패:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Resend 이메일 발송 성공:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('❌ Resend 이메일 발송 중 오류:', error);
    return { success: false, error: error.message };
  }
}

// 광고주 등록 알림 이메일
export async function sendNewClientNotification(clientData: {
  store_name: string;
  business_number: string;
  owner_phone: string;
}) {
  const subject = `새로운 광고주가 등록되었습니다 - ${clientData.store_name}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">🎉 새로운 광고주가 등록되었습니다</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #666;">업체명:</td>
            <td style="padding: 10px 0; color: #333;">${clientData.store_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #666;">사업자번호:</td>
            <td style="padding: 10px 0; color: #333;">${clientData.business_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #666;">연락처:</td>
            <td style="padding: 10px 0; color: #333;">${clientData.owner_phone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #666;">등록일시:</td>
            <td style="padding: 10px 0; color: #333;">${new Date().toLocaleString('ko-KR')}</td>
          </tr>
        </table>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #999; font-size: 14px;">
          이 메일은 리뷰프로그램 시스템에서 자동으로 발송되었습니다.
        </p>
      </div>
    </div>
  `;

  return sendEmailWithResend(subject, html);
}