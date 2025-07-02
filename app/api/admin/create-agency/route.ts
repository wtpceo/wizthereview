import { NextRequest, NextResponse } from 'next/server'
import { createAgencyWithAccount } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API 라우트: 대행사 생성 요청 받음')
    
    const body = await request.json()
    console.log('📋 요청 데이터:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      adminEmail: body.adminEmail,
      adminName: body.adminName
    })

    // 필수 필드 검증
    const { name, email, phone, adminEmail, adminPassword, adminName } = body
    
    if (!name || !email || !phone || !adminEmail || !adminPassword || !adminName) {
      return NextResponse.json(
        { success: false, error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email) || !emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { success: false, error: '올바른 이메일 형식을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 대행사 생성 실행
    console.log('🏢 대행사 생성 프로세스 시작...')
    const result = await createAgencyWithAccount({
      name,
      email,
      phone,
      adminEmail,
      adminPassword,
      adminName
    })

    if (result.success) {
      console.log('✅ 대행사 생성 성공')
      return NextResponse.json({
        success: true,
        message: '대행사가 성공적으로 생성되었습니다.',
        data: {
          agency: result.data?.agency,
          user: { 
            id: result.data?.user?.id, 
            email: result.data?.user?.email 
          }
        }
      })
    } else {
      console.error('❌ 대행사 생성 실패:', result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('💥 API 라우트 에러:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
} 