import { NextRequest, NextResponse } from 'next/server';
import { createClientPublic, uploadClientFilePublic } from '@/lib/database-public';
import { FileType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const clientDataString = formData.get('clientData') as string;
    const body = JSON.parse(clientDataString);
    
    // 필수 필드 검증
    if (!body.store_name || !body.business_number || !body.owner_phone) {
      return NextResponse.json(
        { error: '필수 정보를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사업자번호 형식 검증 (하이픈 제거)
    const businessNumber = body.business_number.replace(/-/g, '');
    if (!/^\d{10}$/.test(businessNumber)) {
      return NextResponse.json(
        { error: '올바른 사업자등록번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 휴대폰번호 형식 검증
    const phoneNumber = body.owner_phone.replace(/-/g, '');
    if (!/^01\d{8,9}$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: '올바른 휴대폰번호 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 계약 개월수 검증
    const contractMonths = parseInt(body.contract_months) || 12;
    if (contractMonths < 1 || contractMonths > 120) {
      return NextResponse.json(
        { error: '계약 개월수는 1~120 사이여야 합니다.' },
        { status: 400 }
      );
    }

    // 플랫폼 정보 검증
    const platforms = body.platforms || [];
    if (platforms.length > 7) {
      return NextResponse.json(
        { error: '플랫폼은 최대 7개까지만 등록할 수 있습니다.' },
        { status: 400 }
      );
    }

    // 광고주 생성 (기본 agency_id는 1로 설정 - 나중에 인증 기반으로 변경 필요)
    const clientData = {
      store_name: body.store_name,
      business_number: businessNumber,
      owner_phone: body.owner_phone,
      agency_id: 1, // TODO: 실제 영업사원의 대행사 ID로 변경 필요
      memo: body.memo || '',
      guide: body.guide || '',
      service: body.service || '',
      contract_months: contractMonths,
      contract_start_date: body.contract_start_date || null,
      contract_period: contractMonths,
      contract_end_date: body.contract_end_date || null,
      platforms: platforms.filter((p: any) => p.platform_name), // 플랫폼명이 있는 것만 필터링
    };

    const result = await createClientPublic(clientData);
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // 파일 업로드 처리
    const fileTypes: FileType[] = ['id_card', 'contract', 'cms_application'];
    const uploadPromises: Promise<any>[] = [];
    
    for (const fileType of fileTypes) {
      const file = formData.get(fileType) as File | null;
      if (file) {
        uploadPromises.push(
          uploadClientFilePublic({
            client_id: result.data.id,
            file_type: fileType,
            file: file,
          })
        );
      }
    }
    
    // 모든 파일 업로드 처리 (실패해도 광고주 등록은 성공으로 처리)
    if (uploadPromises.length > 0) {
      try {
        await Promise.all(uploadPromises);
        console.log('✅ 파일 업로드 완료');
      } catch (fileError) {
        console.error('⚠️ 파일 업로드 실패:', fileError);
        // 파일 업로드 실패는 무시하고 계속 진행
      }
    }

    return NextResponse.json({
      success: true,
      client: result.data,
      message: result.message || '광고주가 성공적으로 등록되었습니다.',
    });
  } catch (error: any) {
    console.error('광고주 등록 오류:', error);
    
    // 중복 사업자번호 오류 처리
    if (error.message?.includes('이미 등록된 사업자번호')) {
      return NextResponse.json(
        { error: '이미 등록된 사업자번호입니다.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '광고주 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}