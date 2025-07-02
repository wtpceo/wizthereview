import { supabase, supabaseAdmin } from './supabase'

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
      memo: client.memo || ''
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
  platforms?: Array<{
    platform_name: string
    platform_id: string
    platform_password: string
    shop_id: string
  }>
}) {
  try {
    // 클라이언트 생성
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert([{
        store_name: client.store_name,
        business_number: client.business_number,
        owner_phone: client.owner_phone,
        agency_id: client.agency_id,
        memo: client.memo
      }])
      .select()
      .single()

    if (clientError) throw clientError

    // 플랫폼 정보가 있으면 추가
    if (client.platforms && client.platforms.length > 0) {
      const platformData = client.platforms.map(platform => ({
        client_id: clientData.id,
        ...platform
      }))

      const { error: platformError } = await supabase
        .from('client_platforms')
        .insert(platformData)

      if (platformError) throw platformError
    }

    return { data: clientData, error: null }
  } catch (error) {
    console.error('Error creating client:', error)
    return { data: null, error }
  }
}

export async function updateClient(
  clientId: number,
  updates: {
    store_name?: string
    business_number?: string
    owner_phone?: string
    memo?: string
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
    const { data, error } = await supabase
      .from('client_platforms')
      .select('*')
      .eq('client_id', clientId)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching client platforms:', error)
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
        ...platform
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