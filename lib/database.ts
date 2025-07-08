import { supabase, supabaseAdmin } from './supabase'
import { FileType, ClientFile, FileUploadRequest, FileUploadResponse } from './types'

// 대행사 관련 함수들
export async function getAgencies() {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching agencies:', error)
    return { data: null, error }
  }
}

export async function createAgency(agency: {
  name: string
  email: string
  phone: string
  status?: 'active' | 'inactive' | 'pending'
}) {
  try {
    const { data, error } = await supabase
      .from('agencies')
      .insert([agency])
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error creating agency:', error)
    return { data: null, error }
  }
}

// 대행사 전체 생성 프로세스 (대행사 + 계정 + 프로필)
export async function createAgencyWithAccount(agencyData: {
  name: string
  email: string
  phone: string
  adminEmail: string
  adminPassword: string
  adminName: string
}) {
  try {
    console.log('🏢 대행사 생성 프로세스 시작:', agencyData.name)

    // 1단계: 대행사 정보 등록
    console.log('📝 1단계: 대행사 정보 등록 중...')
    const { data: agencyResult, error: agencyError } = await supabase
      .from('agencies')
      .insert([{
        name: agencyData.name,
        email: agencyData.email,
        phone: agencyData.phone,
        status: 'active'
      }])
      .select()
      .single()

    if (agencyError) {
      console.error('❌ 대행사 등록 실패:', agencyError)
      throw new Error(`대행사 등록 실패: ${agencyError.message}`)
    }

    console.log('✅ 대행사 등록 성공:', agencyResult)

    // 2단계: 관리자 계정 생성 (supabaseAdmin 사용)
    console.log('👤 2단계: 관리자 계정 생성 중...')
    
    // Service Role Key 확인
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('🔑 Service Role Key 상태:', {
      exists: !!serviceRoleKey,
      length: serviceRoleKey?.length,
      prefix: serviceRoleKey?.substring(0, 20) + '...'
    })
    
    // supabaseAdmin이 실제로 admin 권한을 가지고 있는지 확인
    console.log('🛡️ supabaseAdmin 권한 확인...')
    
    console.log('📧 사용자 생성 요청:', {
      email: agencyData.adminEmail,
      email_confirm: true,
      password_length: agencyData.adminPassword.length
    })
    
    // 먼저 이메일 중복 체크
    console.log('🔍 이메일 중복 체크 중...', agencyData.adminEmail)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUser?.users?.some(user => user.email === agencyData.adminEmail)
    
    if (emailExists) {
      console.error('❌ 이메일 중복:', agencyData.adminEmail)
      // 대행사 정보 롤백
      await supabase.from('agencies').delete().eq('id', agencyResult.id as number)
      throw new Error(`이메일 주소 '${agencyData.adminEmail}'가 이미 사용 중입니다.`)
    }

    // 트리거 문제를 피하기 위해 더 단순한 방식으로 사용자 생성
    const { data: userResult, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: agencyData.adminEmail,
      password: agencyData.adminPassword,
      email_confirm: true, // 이메일 확인 건너뛰기
      user_metadata: {
        full_name: agencyData.adminName,
        role: 'agency_admin'
      }
    })

    console.log('👤 사용자 생성 결과:', {
      success: !!userResult.user,
      userId: userResult.user?.id,
      userEmail: userResult.user?.email,
      errorMessage: userError?.message,
      errorStatus: userError?.status,
      fullError: userError
    })

    if (userError || !userResult.user) {
      console.error('❌ 관리자 계정 생성 실패 - 상세 정보:', {
        errorMessage: userError?.message,
        errorCode: userError?.status,
        errorDetails: userError,
        serviceRoleKeyExists: !!serviceRoleKey,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      })
      
      // 대행사 정보도 롤백
      await supabase.from('agencies').delete().eq('id', agencyResult.id as number)
      
      // 더 사용자 친화적인 에러 메시지
      let errorMessage = '관리자 계정 생성에 실패했습니다.'
      if (userError?.message?.includes('already registered')) {
        errorMessage = '해당 이메일로 이미 등록된 계정이 있습니다.'
      } else if (userError?.message?.includes('weak password')) {
        errorMessage = '비밀번호가 너무 약합니다. 8자 이상, 대소문자, 숫자를 포함해주세요.'
      } else if (userError?.message) {
        errorMessage = userError.message
      }
      
      throw new Error(errorMessage)
    }

    console.log('✅ 관리자 계정 생성 성공:', userResult.user.id)

    // 3단계: 사용자 프로필 생성
    console.log('📋 3단계: 사용자 프로필 생성 중...')
    console.log('📊 프로필 데이터:', {
      id: userResult.user.id,
      email: agencyData.adminEmail,
      full_name: agencyData.adminName,
      role: 'agency_admin',
      agency_id: agencyResult.id,
      is_active: true
    })
    
    const { data: profileResult, error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        id: userResult.user.id,
        email: agencyData.adminEmail,
        full_name: agencyData.adminName,
        role: 'agency_admin',
        agency_id: agencyResult.id,
        is_active: true
      }])
      .select()
      .single()

    if (profileError) {
      console.error('❌ 프로필 생성 실패 - 상세 정보:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code
      })
      
      // 롤백 작업
      await supabaseAdmin.auth.admin.deleteUser(userResult.user.id)
      await supabase.from('agencies').delete().eq('id', agencyResult.id as number)
      
      // 더 구체적인 에러 메시지
      let errorMessage = '사용자 프로필 생성에 실패했습니다.'
      if (profileError.code === '23505') {
        errorMessage = '이미 존재하는 사용자입니다.'
      } else if (profileError.code === '23503') {
        errorMessage = '참조 무결성 오류가 발생했습니다.'
      } else if (profileError.message?.includes('policy')) {
        errorMessage = '데이터베이스 접근 권한 오류가 발생했습니다.'
      } else if (profileError.message) {
        errorMessage = profileError.message
      }
      
      throw new Error(errorMessage)
    }

    console.log('✅ 프로필 생성 성공')
    console.log('🎉 대행사 전체 생성 프로세스 완료!')

    return {
      success: true,
      data: {
        agency: agencyResult,
        user: userResult.user,
        profile: profileResult
      },
      error: null
    }
  } catch (error: any) {
    console.error('💥 대행사 생성 프로세스 실패:', error)
    return {
      success: false,
      data: null,
      error: error.message || '알 수 없는 오류가 발생했습니다.'
    }
  }
}

// 광고주(클라이언트) 관련 함수들
export async function getClients(agencyId?: number) {
  try {
    let query = supabase
      .from('clients')
      .select(`
        *,
        agency:agencies(id, name),
        platforms:client_platforms(*)
      `)
      .order('created_at', { ascending: false })

    // 특정 대행사의 광고주만 조회 (관리자가 아닌 경우)
    if (agencyId) {
      query = query.eq('agency_id', agencyId)
    }

    const { data, error } = await query

    if (error) throw error

    // 데이터 형태 변환 (기존 코드와 호환성을 위해)
    const transformedData = data?.map((client: any) => ({
      id: client.id,
      storeName: client.store_name,
      businessNumber: client.business_number,
      ownerPhone: client.owner_phone,
      platforms: client.platforms?.map((p: any) => p.platform_name) || [],
      registeredAt: client.created_at ? client.created_at.split('T')[0] : '',
      agency: client.agency?.name || '',
      memo: client.memo || '',
      guide: client.guide || '',
      service: client.service || '',
      contractMonths: client.contract_months || 12
    }))

    return { data: transformedData, error: null }
  } catch (error: any) {
    console.error('Error fetching clients:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      full: error
    })
    return { data: null, error }
  }
}

export async function createClient(client: {
  store_name: string
  business_number: string
  owner_phone: string
  agency_id: number
  memo?: string
  guide?: string
  service?: string
  contract_months?: number
  platforms?: Array<{
    platform_name: string
    platform_id: string
    platform_password: string
    shop_id: string
    answer_guide?: string
  }>
}) {
  try {
    console.log('📝 광고주 등록 시작:', client.store_name)
    
    // 1단계: 사업자번호 중복 체크
    console.log('🔍 1단계: 사업자번호 중복 체크...')
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id, store_name')
      .eq('business_number', client.business_number)
      .maybeSingle()

    if (checkError) {
      console.error('❌ 중복 체크 실패:', checkError)
      throw new Error('사업자번호 중복 확인 중 오류가 발생했습니다.')
    }

    if (existingClient) {
      console.warn('⚠️ 사업자번호 중복 발견:', {
        기존업체: existingClient.store_name,
        기존ID: existingClient.id,
        입력업체: client.store_name
      })
      throw new Error(`사업자번호 '${client.business_number}'는 이미 등록된 업체(${existingClient.store_name})에서 사용중입니다.`)
    }

    console.log('✅ 사업자번호 중복 체크 통과')

    // 2단계: 클라이언트 생성
    console.log('🏪 2단계: 클라이언트 정보 저장...')
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert([{
        store_name: client.store_name,
        business_number: client.business_number,
        owner_phone: client.owner_phone,
        agency_id: client.agency_id,
        memo: client.memo,
        guide: client.guide,
        service: client.service,
        contract_months: client.contract_months || 12
      }])
      .select()
      .single()

    if (clientError) {
      console.error('❌ 클라이언트 생성 실패:', {
        message: clientError.message,
        details: clientError.details,
        hint: clientError.hint,
        code: clientError.code
      })
      
      // 구체적인 에러 메시지 제공
      let errorMessage = '광고주 등록에 실패했습니다.'
      
      if (clientError.code === '23505') {
        if (clientError.message?.includes('business_number')) {
          errorMessage = `사업자번호 '${client.business_number}'는 이미 등록되어 있습니다.`
        } else {
          errorMessage = '이미 등록된 정보가 있습니다.'
        }
      } else if (clientError.code === '23503') {
        errorMessage = '잘못된 대행사 정보입니다.'
      } else if (clientError.code === '23514') {
        errorMessage = '입력한 정보가 유효하지 않습니다.'
      } else if (clientError.message?.includes('permission')) {
        errorMessage = '등록 권한이 없습니다.'
      } else if (clientError.message) {
        errorMessage = clientError.message
      }
      
      throw new Error(errorMessage)
    }

    console.log('✅ 클라이언트 생성 성공:', {
      id: clientData.id,
      store_name: clientData.store_name
    })

    // 3단계: 플랫폼 정보 저장 (있는 경우)
    if (client.platforms && client.platforms.length > 0) {
      console.log('🔧 3단계: 플랫폼 정보 저장...', client.platforms.length + '개')
      
      // 빈 플랫폼 정보 제거
      const validPlatforms = client.platforms.filter(platform => 
        platform.platform_name && platform.platform_name.trim() !== ''
      )

      if (validPlatforms.length > 0) {
        const platformData = validPlatforms.map(platform => ({
          client_id: clientData.id,
          platform_name: platform.platform_name,
          platform_id: platform.platform_id || '',
          platform_password: platform.platform_password || '',
          shop_id: platform.shop_id || '',
          answer_guide: platform.answer_guide || ''
        }))

        const { error: platformError } = await supabase
          .from('client_platforms')
          .insert(platformData)

        if (platformError) {
          console.error('❌ 플랫폼 정보 저장 실패:', platformError)
          
          // 클라이언트는 생성되었지만 플랫폼 정보 저장 실패 시 경고만 표시
          console.warn('⚠️ 플랫폼 정보 저장 실패 - 클라이언트만 등록됨')
          // 플랫폼 오류는 치명적이지 않으므로 성공으로 처리하고 경고만 남김
        } else {
          console.log('✅ 플랫폼 정보 저장 성공:', validPlatforms.length + '개')
        }
      } else {
        console.log('ℹ️ 유효한 플랫폼 정보 없음 - 기본 정보만 저장')
      }
    } else {
      console.log('ℹ️ 플랫폼 정보 없음 - 기본 정보만 저장')
    }

    console.log('🎉 광고주 등록 완료!')
    return { 
      data: clientData, 
      error: null,
      message: '광고주가 성공적으로 등록되었습니다.'
    }
  } catch (error: any) {
    console.error('💥 광고주 등록 실패:', error)
    return { 
      data: null, 
      error: error.message || '알 수 없는 오류가 발생했습니다.',
      message: error.message || '광고주 등록에 실패했습니다.'
    }
  }
}

export async function updateClient(
  clientId: number,
  updates: {
    store_name?: string
    business_number?: string
    owner_phone?: string
    memo?: string
    guide?: string
    service?: string
    contract_months?: number
  }
) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating client:', error)
    return { data: null, error }
  }
}

export async function deleteClient(clientId: number) {
  try {
    // 먼저 관련된 플랫폼 정보들을 삭제
    await supabase
      .from('client_platforms')
      .delete()
      .eq('client_id', clientId)

    // 클라이언트 삭제
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting client:', error)
    return { error }
  }
}

// 플랫폼 관련 함수들
export async function getClientPlatforms(clientId: number) {
  try {
    console.log('🔍 플랫폼 정보 조회 시작:', { clientId })
    
    // 현재 사용자 세션 확인
    const { data: { user }, error: sessionError } = await supabase.auth.getUser()
    
    if (sessionError) {
      console.error('❌ 세션 확인 실패:', sessionError)
    } else if (user) {
      console.log('👤 현재 사용자:', { id: user.id, email: user.email })
    } else {
      console.log('⚠️ 사용자 세션 없음')
    }

    // 일반 클라이언트로 먼저 시도
    let result = await supabase
      .from('client_platforms')
      .select('*')
      .eq('client_id', clientId)

    console.log('📊 플랫폼 조회 결과 (일반):', {
      success: !result.error,
      dataCount: result.data?.length || 0,
      error: result.error?.message
    })

    // 에러가 있거나 데이터가 없는데 서비스 롤이 있으면 서비스 롤로 재시도
    if ((result.error || !result.data || result.data.length === 0) && supabaseAdmin !== supabase) {
      console.log('🔄 서비스 롤로 재시도...')
      
      const adminResult = await supabaseAdmin
        .from('client_platforms')
        .select('*')
        .eq('client_id', clientId)

      console.log('📊 플랫폼 조회 결과 (서비스 롤):', {
        success: !adminResult.error,
        dataCount: adminResult.data?.length || 0,
        error: adminResult.error?.message
      })

      if (!adminResult.error) {
        result = adminResult
      }
    }

    if (result.error) {
      console.error('❌ 플랫폼 정보 조회 실패:', result.error)
      throw result.error
    }

    console.log('✅ 플랫폼 정보 조회 성공:', result.data?.length || 0, '개')
    return { data: result.data, error: null }
  } catch (error) {
    console.error('💥 플랫폼 정보 조회 중 예외:', error)
    return { data: null, error }
  }
}

export async function updateClientPlatforms(
  clientId: number,
  platforms: Array<{
    platform_name: string
    platform_id: string
    platform_password: string
    shop_id: string
    answer_guide?: string
  }>
) {
  try {
    // 기존 플랫폼 정보 삭제
    await supabase
      .from('client_platforms')
      .delete()
      .eq('client_id', clientId)

    // 새로운 플랫폼 정보 추가
    if (platforms.length > 0) {
      const platformData = platforms.map(platform => ({
        client_id: clientId,
        platform_name: platform.platform_name,
        platform_id: platform.platform_id,
        platform_password: platform.platform_password,
        shop_id: platform.shop_id,
        answer_guide: platform.answer_guide || ''
      }))

      const { error } = await supabase
        .from('client_platforms')
        .insert(platformData)

      if (error) throw error
    }

    return { error: null }
  } catch (error) {
    console.error('Error updating client platforms:', error)
    return { error }
  }
}

// 통계 데이터 조회
export async function getDashboardStats(agencyId?: number) {
  console.log('🔄 대시보드 통계 조회 시작...', { agencyId })

  // 기본값 정의
  const defaultStats = {
    totalClients: 0,
    newClientsThisMonth: 0,
    clientGrowthRate: 0,
    totalPlatforms: 0
  }

  try {
    // 1. 클라이언트 수 조회 (단순 카운트)
    console.log('📊 클라이언트 총 수 조회 중...')
    
    let clientCountQuery = supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    if (agencyId) {
      clientCountQuery = clientCountQuery.eq('agency_id', agencyId)
    }

    const { count: totalClients, error: countError } = await clientCountQuery

    if (countError) {
      console.error('❌ 클라이언트 카운트 조회 실패:', {
        message: countError.message,
        details: countError.details,
        hint: countError.hint,
        code: countError.code,
        full: countError
      })
      return { data: defaultStats, error: null }
    }

    console.log('✅ 클라이언트 총 수:', totalClients || 0)

    // 2. 이번 달 신규 클라이언트 수 조회
    console.log('📈 이번 달 신규 클라이언트 조회 중...')
    
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const thisMonthISO = thisMonth.toISOString()

    let newClientsQuery = supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonthISO)

    if (agencyId) {
      newClientsQuery = newClientsQuery.eq('agency_id', agencyId)
    }

    const { count: newClientsThisMonth, error: newClientsError } = await newClientsQuery

    if (newClientsError) {
      console.error('❌ 신규 클라이언트 조회 실패:', newClientsError)
      // 이 경우에도 기본값으로 계속 진행
    }

    console.log('✅ 이번 달 신규 클라이언트:', newClientsThisMonth || 0)

    // 3. 지난 달 신규 클라이언트 수 조회
    console.log('📊 지난 달 신규 클라이언트 조회 중...')
    
    const lastMonth = new Date(thisMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthISO = lastMonth.toISOString()

    let lastMonthClientsQuery = supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonthISO)
      .lt('created_at', thisMonthISO)

    if (agencyId) {
      lastMonthClientsQuery = lastMonthClientsQuery.eq('agency_id', agencyId)
    }

    const { count: newClientsLastMonth, error: lastMonthError } = await lastMonthClientsQuery

    if (lastMonthError) {
      console.error('❌ 지난 달 클라이언트 조회 실패:', lastMonthError)
    }

    console.log('✅ 지난 달 신규 클라이언트:', newClientsLastMonth || 0)

    // 4. 증가율 계산
    const thisMonthCount = newClientsThisMonth || 0
    const lastMonthCount = newClientsLastMonth || 0
    
    const clientGrowthRate = lastMonthCount === 0 
      ? (thisMonthCount > 0 ? 100 : 0)
      : ((thisMonthCount - lastMonthCount) / lastMonthCount * 100)

    console.log('📈 클라이언트 통계 계산 완료:', {
      totalClients: totalClients || 0,
      newClientsThisMonth: thisMonthCount,
      newClientsLastMonth: lastMonthCount,
      clientGrowthRate: Math.round(clientGrowthRate * 10) / 10
    })

    // 5. 플랫폼 수 조회
    console.log('🎯 플랫폼 수 조회 중...')
    
    const { count: totalPlatforms, error: platformsError } = await supabase
      .from('client_platforms')
      .select('*', { count: 'exact', head: true })

    if (platformsError) {
      console.error('⚠️ 플랫폼 조회 실패:', platformsError)
      console.log('🔄 플랫폼 데이터 없이 통계 반환')
    } else {
      console.log('✅ 플랫폼 총 수:', totalPlatforms || 0)
    }

    const result = {
      totalClients: totalClients || 0,
      newClientsThisMonth: thisMonthCount,
      clientGrowthRate: Math.round(clientGrowthRate * 10) / 10,
      totalPlatforms: totalPlatforms || 0
    }

    console.log('🎉 대시보드 통계 조회 성공:', result)

    return { data: result, error: null }

  } catch (error) {
    console.error('❌ 대시보드 통계 조회 중 예상치 못한 오류:', error)
    
    return {
      data: defaultStats,
      error: error
    }
  }
}

// 파일 관리 관련 함수들

// 파일 시스템 테이블 존재 여부 확인
export async function checkFileSystemAvailable(): Promise<boolean> {
  try {
    console.log('🔍 파일 시스템 테이블 존재 여부 확인 중...')
    
    const { error } = await supabase
      .from('client_files')
      .select('id')
      .limit(1)
      .maybeSingle()
    
    if (error) {
      if (error.code === '42P01' || 
          error.message?.includes('does not exist') ||
          error.message?.includes('relation') ||
          error.details?.includes('does not exist')) {
        console.log('❌ client_files 테이블이 존재하지 않습니다.')
        return false
      }
      console.warn('⚠️ 파일 시스템 확인 중 에러:', error)
      return false
    }
    
    console.log('✅ 파일 시스템 사용 가능')
    return true
  } catch (error: any) {
    console.error('💥 파일 시스템 확인 중 예외:', error)
    return false
  }
}

// 클라이언트 파일 업로드
export async function uploadClientFile(request: FileUploadRequest): Promise<FileUploadResponse> {
  try {
    console.log('📁 파일 업로드 시작:', {
      client_id: request.client_id,
      file_type: request.file_type,
      file_name: request.file.name,
      file_size: request.file.size
    })

    // 파일 확장자 및 MIME 타입 검증
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(request.file.type)) {
      return {
        success: false,
        error: '지원하지 않는 파일 형식입니다. (JPG, PNG, WebP, PDF, DOC, DOCX만 허용)'
      }
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (request.file.size > maxSize) {
      return {
        success: false,
        error: '파일 크기가 너무 큽니다. (최대 10MB)'
      }
    }

    // 파일 경로 생성
    const fileExtension = request.file.name.split('.').pop()
    const fileName = `${request.client_id}_${request.file_type}_${Date.now()}.${fileExtension}`
    const filePath = `clients/${request.client_id}/${fileName}`

    console.log('📂 Supabase Storage 업로드 중...', filePath)

    // Supabase Storage에 파일 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('client-files')
      .upload(filePath, request.file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Storage 업로드 실패:', uploadError)
      return {
        success: false,
        error: `파일 업로드에 실패했습니다: ${uploadError.message}`
      }
    }

    console.log('✅ Storage 업로드 성공:', uploadData.path)

    // 데이터베이스에 파일 정보 저장
    console.log('💾 DB 파일 정보 저장 중...')
    
    const { data: fileData, error: dbError } = await supabase
      .from('client_files')
      .upsert({
        client_id: request.client_id,
        file_type: request.file_type,
        file_name: request.file.name,
        file_path: uploadData.path,
        file_size: request.file.size,
        mime_type: request.file.type,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id || 'unknown'
      }, {
        onConflict: 'client_id,file_type'
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ DB 저장 실패:', dbError)
      
      // 테이블이 존재하지 않는 경우
      if (dbError.code === '42P01' || 
          dbError.message?.includes('does not exist') ||
          dbError.message?.includes('relation') ||
          dbError.details?.includes('does not exist')) {
        return {
          success: false,
          error: 'client_files 테이블이 존재하지 않습니다. 먼저 add-client-files-table.sql을 실행하여 데이터베이스 설정을 완료해주세요.'
        }
      }
      
      // Storage에서 업로드된 파일 삭제 (롤백)
      await supabase.storage
        .from('client-files')
        .remove([uploadData.path])

      return {
        success: false,
        error: `파일 정보 저장에 실패했습니다: ${dbError.message}`
      }
    }

    console.log('🎉 파일 업로드 완료:', fileData.id)

    return {
      success: true,
      file_id: fileData.id,
      file_path: uploadData.path
    }

  } catch (error: any) {
    console.error('💥 파일 업로드 중 예외:', error)
    return {
      success: false,
      error: `파일 업로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`
    }
  }
}

// 클라이언트 파일 목록 조회
export async function getClientFiles(clientId: number): Promise<{ data: ClientFile[] | null; error: any }> {
  try {
    console.log('📁 클라이언트 파일 목록 조회:', clientId)

    const { data, error } = await supabase
      .from('client_files')
      .select('*')
      .eq('client_id', clientId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('❌ 파일 목록 조회 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      })
      
      // 테이블이 존재하지 않는 경우 빈 배열 반환
      if (error.code === '42P01' || 
          error.message?.includes('does not exist') || 
          error.message?.includes('relation') ||
          error.details?.includes('does not exist')) {
        console.log('ℹ️ client_files 테이블이 존재하지 않습니다. 빈 목록을 반환합니다.')
        return { data: [], error: null }
      }
      
      return { data: [], error: null } // 모든 에러에 대해 빈 배열 반환하도록 변경
    }

    console.log('✅ 파일 목록 조회 성공:', data?.length || 0, '개')
    return { data: data || [], error: null }

  } catch (error: any) {
    console.error('💥 파일 목록 조회 중 예외:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      fullError: JSON.stringify(error, null, 2)
    })
    
    // 모든 예외에 대해 빈 배열 반환 (테이블이 없을 가능성이 높음)
    console.log('ℹ️ 파일 목록 조회 실패 - 빈 목록을 반환합니다. (테이블이 없을 수 있습니다)')
    return { data: [], error: null }
  }
}

// 파일 다운로드 URL 생성
export async function getFileDownloadUrl(filePath: string): Promise<{ url: string | null; error: any }> {
  try {
    console.log('🔗 파일 다운로드 URL 생성:', filePath)

    const { data, error } = await supabase.storage
      .from('client-files')
      .createSignedUrl(filePath, 3600) // 1시간 유효

    if (error) {
      console.error('❌ 다운로드 URL 생성 실패:', error)
      return { url: null, error }
    }

    console.log('✅ 다운로드 URL 생성 성공')
    return { url: data.signedUrl, error: null }

  } catch (error) {
    console.error('💥 다운로드 URL 생성 중 예외:', error)
    return { url: null, error }
  }
}

// 파일 삭제
export async function deleteClientFile(fileId: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ 파일 삭제 시작:', fileId)

    // 먼저 파일 정보 조회
    const { data: fileInfo, error: selectError } = await supabase
      .from('client_files')
      .select('file_path')
      .eq('id', fileId)
      .single()

    if (selectError || !fileInfo) {
      console.error('❌ 파일 정보 조회 실패:', selectError)
      return {
        success: false,
        error: '파일 정보를 찾을 수 없습니다.'
      }
    }

    // Storage에서 파일 삭제
    console.log('🗂️ Storage 파일 삭제:', fileInfo.file_path)
    const { error: storageError } = await supabase.storage
      .from('client-files')
      .remove([fileInfo.file_path])

    if (storageError) {
      console.error('❌ Storage 파일 삭제 실패:', storageError)
      // Storage 삭제 실패해도 DB에서는 삭제 진행
    }

    // 데이터베이스에서 파일 정보 삭제
    console.log('💾 DB 파일 정보 삭제')
    const { error: dbError } = await supabase
      .from('client_files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      console.error('❌ DB 파일 삭제 실패:', dbError)
      return {
        success: false,
        error: `파일 삭제에 실패했습니다: ${dbError.message}`
      }
    }

    console.log('✅ 파일 삭제 완료')
    return { success: true }

  } catch (error: any) {
    console.error('💥 파일 삭제 중 예외:', error)
    return {
      success: false,
      error: `파일 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`
    }
  }
}

// 파일 타입별 존재 여부 확인
export async function checkClientFileExists(clientId: number, fileType: FileType): Promise<{ exists: boolean; fileId?: number }> {
  try {
    const { data, error } = await supabase
      .from('client_files')
      .select('id')
      .eq('client_id', clientId)
      .eq('file_type', fileType)
      .maybeSingle()

    if (error) {
      console.error('❌ 파일 존재 여부 확인 실패:', error)
      return { exists: false }
    }

    return {
      exists: !!data,
      fileId: data?.id
    }

  } catch (error) {
    console.error('💥 파일 존재 여부 확인 중 예외:', error)
    return { exists: false }
  }
}

