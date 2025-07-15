import { supabaseAdmin } from './supabase'
import { syncNewClientToSheet } from './google-sheets'
import { FileType, FileUploadRequest } from './types'

// 인증 없이 파일을 업로드하는 함수 (영업사원용)
export async function uploadClientFilePublic(request: FileUploadRequest) {
  try {
    console.log('📤 파일 업로드 시작:', {
      client_id: request.client_id,
      file_type: request.file_type,
      file_name: request.file.name,
      file_size: request.file.size
    })

    // Supabase Storage 사용 가능 여부 확인
    const { data: testUpload, error: testError } = await supabaseAdmin.storage
      .from('client-files')
      .list('', { limit: 1 })
    
    if (testError && testError.message.includes('not found')) {
      console.error('❌ Supabase Storage 버킷이 설정되지 않음')
      return {
        success: false,
        error: 'Supabase Storage가 설정되지 않았습니다. 관리자에게 문의하세요.'
      }
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await request.file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // 파일 경로 생성 (client_id/file_type/timestamp_filename)
    const timestamp = Date.now()
    const fileExt = request.file.name.split('.').pop()
    const fileName = `${timestamp}_${request.file_type}.${fileExt}`
    const filePath = `${request.client_id}/${request.file_type}/${fileName}`

    // 기존 파일 삭제 (같은 타입의 파일은 하나만 유지)
    const { data: existingFiles } = await supabaseAdmin.storage
      .from('client-files')
      .list(`${request.client_id}/${request.file_type}`)
    
    if (existingFiles && existingFiles.length > 0) {
      for (const file of existingFiles) {
        await supabaseAdmin.storage
          .from('client-files')
          .remove([`${request.client_id}/${request.file_type}/${file.name}`])
      }
    }

    // 파일 업로드
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('client-files')
      .upload(filePath, fileBuffer, {
        contentType: request.file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('❌ 파일 업로드 실패:', uploadError)
      return {
        success: false,
        error: '파일 업로드에 실패했습니다.'
      }
    }

    // 데이터베이스에 파일 정보 저장
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from('client_files')
      .insert({
        client_id: request.client_id,
        file_type: request.file_type,
        file_name: request.file.name,
        file_path: filePath,
        file_size: request.file.size,
        mime_type: request.file.type
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ 파일 정보 저장 실패:', dbError)
      // 업로드된 파일 롤백
      await supabaseAdmin.storage
        .from('client-files')
        .remove([filePath])
      
      return {
        success: false,
        error: '파일 정보 저장에 실패했습니다.'
      }
    }

    console.log('✅ 파일 업로드 완료:', fileRecord.id)
    
    return {
      success: true,
      file_id: fileRecord.id,
      file_path: filePath
    }
  } catch (error: any) {
    console.error('💥 파일 업로드 중 예외 발생:', error)
    return {
      success: false,
      error: error.message || '파일 업로드 중 오류가 발생했습니다.'
    }
  }
}

// 인증 없이 광고주를 생성하는 함수 (영업사원용)
export async function createClientPublic(client: {
  store_name: string
  business_number: string
  owner_phone: string
  agency_id: number
  memo?: string
  guide?: string
  service?: string
  contract_months: number
  platforms?: Array<{
    platform_name: string
    platform_id?: string
    platform_password?: string
    shop_id?: string
    answer_guide?: string
  }>
}) {
  try {
    console.log('📝 영업사원 광고주 등록 시작:', client.store_name)
    
    // 사업자번호 중복 체크
    const { data: existingClient, error: checkError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('business_number', client.business_number)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ 중복 체크 오류:', checkError)
      throw new Error('사업자번호 확인 중 오류가 발생했습니다.')
    }
    
    if (existingClient) {
      throw new Error('이미 등록된 사업자번호입니다.')
    }
    
    // 기본 클라이언트 정보 저장
    const clientToInsert = {
      store_name: client.store_name,
      business_number: client.business_number,
      owner_phone: client.owner_phone,
      agency_id: client.agency_id,
      memo: client.memo || '',
      guide: client.guide || '',
      service: client.service || '',
      contract_months: client.contract_months || 12
    }
    
    console.log('💾 클라이언트 정보 저장 중...')
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert([clientToInsert])
      .select()
      .single()
    
    if (clientError) {
      console.error('❌ 클라이언트 저장 실패:', clientError)
      throw new Error('광고주 정보 저장에 실패했습니다: ' + clientError.message)
    }
    
    console.log('✅ 클라이언트 저장 성공:', clientData.id)
    
    // 플랫폼 정보 저장
    if (client.platforms && client.platforms.length > 0) {
      const validPlatforms = client.platforms.filter(platform => 
        platform.platform_name && platform.platform_name.trim() !== ''
      )
      
      if (validPlatforms.length > 0) {
        console.log('💾 플랫폼 정보 저장 중...', validPlatforms.length + '개')
        
        const platformsToInsert = validPlatforms.map(platform => ({
          client_id: clientData.id,
          platform_name: platform.platform_name,
          platform_id: platform.platform_id || '',
          platform_password: platform.platform_password || '',
          shop_id: platform.shop_id || '',
          answer_guide: platform.answer_guide || ''
        }))
        
        const { error: platformError } = await supabaseAdmin
          .from('client_platforms')
          .insert(platformsToInsert)
        
        if (platformError) {
          console.error('⚠️ 플랫폼 정보 저장 실패:', platformError)
          // 플랫폼 저장 실패는 치명적이지 않으므로 계속 진행
        } else {
          console.log('✅ 플랫폼 정보 저장 성공:', validPlatforms.length + '개')
        }
      }
    }
    
    console.log('🎉 영업사원 광고주 등록 완료!')
    
    // 실시간 구글 시트 동기화
    try {
      console.log('🔄 영업사원 등록 - 실시간 구글 시트 동기화 시작...')
      console.log('📋 클라이언트 정보:', {
        id: clientData.id,
        store_name: clientData.store_name,
        platforms_count: client.platforms?.length || 0
      })
      
      // 플랫폼 정보가 있는 경우에만 동기화
      if (client.platforms && client.platforms.length > 0) {
        const validPlatforms = client.platforms.filter(platform => 
          platform.platform_name && platform.platform_name.trim() !== ''
        )
        
        console.log('🔍 유효한 플랫폼 정보:', validPlatforms.map(p => ({
          name: p.platform_name,
          hasId: !!p.platform_id,
          hasPassword: !!p.platform_password
        })))
        
        if (validPlatforms.length > 0) {
          console.log('📤 구글 시트 동기화 함수 호출 중...')
          
          const syncResult = await syncNewClientToSheet(
            {
              id: clientData.id,
              store_name: clientData.store_name,
              created_at: clientData.created_at
            },
            validPlatforms
          )
          
          console.log('📨 동기화 결과:', syncResult)
          
          if (syncResult.success) {
            console.log('✅ 영업사원 등록 - 실시간 구글 시트 동기화 완료:', syncResult.message)
          } else {
            console.error('❌ 영업사원 등록 - 실시간 구글 시트 동기화 실패:', syncResult.error)
            console.error('❌ 동기화 실패 상세:', syncResult)
            // 동기화 실패는 치명적이지 않으므로 경고만 표시
          }
        } else {
          console.log('ℹ️ 동기화할 유효한 플랫폼 정보 없음')
        }
      } else {
        console.log('ℹ️ 플랫폼 정보 없음 - 동기화 건너뛰기')
      }
    } catch (syncError: any) {
      console.error('💥 영업사원 등록 - 실시간 동기화 중 예외 발생:', {
        message: syncError.message,
        stack: syncError.stack,
        full: syncError
      })
      // 동기화 실패해도 등록은 성공으로 처리
    }
    
    return { 
      data: clientData, 
      error: null,
      message: '광고주가 성공적으로 등록되었습니다.'
    }
  } catch (error: any) {
    console.error('💥 영업사원 광고주 등록 실패:', error)
    return { 
      data: null, 
      error: error.message || '알 수 없는 오류가 발생했습니다.',
      message: error.message || '광고주 등록에 실패했습니다.'
    }
  }
}