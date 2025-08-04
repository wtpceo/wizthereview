import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 테스트 요청 데이터:', body)
    
    // Base64로 인코딩된 자격증명
    const base64Credentials = "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6InBvd2VyZnVsLWdlbnJlLTQ2NDUwNi10NiIsInByaXZhdGVfa2V5X2lkIjoiMmMwMGMxMjBhMDkwMWEyNGI2MTIxNTU1NmUwYmVlODNiYWFlZTdmMSIsInByaXZhdGVfa2V5IjoiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRGRrNHNVeXkxMUs4WDQKZHRZN2tyQVdGNmE0TlFUYjdUSEE2RWZNR3VmQlcxWWVvWmZ0OHpBRU1rZDRIZGdVZW4yMzNYbEpSaEI5ci8yMAovWHNyZnhXaG43dEl4OEVtSXBqRXZaWDNLMnFHMjBKMFdnMmEzTWlwQWhIVU5LUUMwaFVxbWlqdGVCWi9YUEdvCklIQk1ENTNHbXExdmVaL3lQcmxzeXFVdjdzbmdWOWUvWWNoWE9CT1RhS3FMUStYcmNRZXdnWGN2c3hOL2hFRlYKUkkrK1hXYStpMHgrZlVLcTNIb3VMTXJhNmtzNHFRaHp3Q2dUTFNTTHRXZERYNW1LWXFPY1Y2WW1lRVlaalFBQQpITUtoN0U2VzhtK0RFOFVSMUxSZ2JEem5KcGhkdW9NOUxFYkVGYjZ4R0lZNHhkU2U2WWl5enBsdldCUStJQ1RnCkFmQnlZazl2QWdNQkFBRUNnZ0VBRENEREl1MjdaMmViSVVPYjYvY3JwVGRCTWJiNzM1cDhOOWkwU1ZpSy9wQ1AKRzY1dzlaNGQyWXBJL1lCTFdmK1p1YTBwTWk0S3dWNXNoQnpBYlB2bFJXQ2hWeXFtaUtoVWRWR3RPaklKcXRKVApNUWJXMU14VFBXWk1HZHlSd2tmRHp5ajdVWUxhWHc2ZXp1V0xwVlltSnRTWTVxVDJjTU44Zkd4eEhlT3ptcnNLCkVtelpmcDFIRU4raVhGeU13RnlnOUtFRDFnM1JBNVdyWVNpaDVRWWhQK3cxTVNLdE04N1NZTEl3ZjBEVWpLR0EKMWVCSW5ieHh0TjVqSU01YnFweFdxNUZ3WFJlSGh5a0p4UVI1MFdNRkJaRkZWQWR4VnlKOWxEcGg0RTlJSzhJOApmb01MNCt3ZWZrUzYvN21wOGlHbGtoenV1Rmt2cjdPc0xMRFo1QjludlFLQmdRRDA2TXF4MEl1Q2Nkb0xuS1NTCjA4bDBCWnpFUm0zSlg0R2YxUmFyQm9hTmFObTJkdEJwQ284UU9pOFg4N2hqZVlDcDlrNEhtYWVNdUxNVjJzNisKbWZHUWlLS3lQUW8wT0ptNGJFLzhDeUQ1VmlXSVd4dnhwZXZlVkoxZ3Y4UU02VlpWYjduaGxxRTQyYmE5bzRvcAppSEdGOWNkNk5uNFNDOUh1RURJZjNXcm1hd0tCZ1FEbm5FRWxWa1RUQTdNOUIrUmk3aEdtb2VRNXdGNEpZVG1yCkNrNXVxeHhUMm9zcjNIWDdTYnY3UTQ4TGNyRHdKWlpWZUl4OExZK1RrVXhyWHlpUmdaOWg4VW43RWVucWgrZTgKTzNHYkxFVGdBVmowRFVnbEtrb0NRTnZ5dHliQTg3emhUZ1ZVOThtaDJUS2RtYXQvYlRzUzYzbUNUaERUbzNRbgpXTnNEYUd6VURRS0JnUUNzU3V6MTVRbVFUam9nT3lYSUtYZ3F5QnYrTkxIZG5mUGFGcFdvNGFGYzhDdGhZdnJCCk91MWtkQnBYVmwwY2xnaS9DUWpoN2VYaWFMbU1JVytheFVBYzl4TEdJNHovS2VaeXlMZ0lUMmYySVBXc2xMUDIKNzB3ZEVCZmJUVzFGekEyeGN6VW9qOGlCN3gvUkQ3RU9BUEFrVnNEcnFGUk9xOFFYSDR1endSZ0lXd0tCZ0J1dAp1THRWaS9RTHhTZk9BYVV3L2pzRHJkcVkrcVAwVW9mMk8xbE9hWnc3eWRYOENyMTFHbG4wd091RlVVL2hyZzJZCjBuRWtvTHZwNlZBTGx6V01ZQmU4VmpNQytRbG1KSE9DUnhsY09QN3NLazFBS1JjSDdzQkdNQUxaa0hBT3NNdmMKSHhjQVpjQkp6SnE0K3AzSDEvOXkxSnFWNmJ6aEU4aC8vZXh5Vms4aEFvR0FIU1Z2VDFlayt5ZEdZa1Z3cGZJdgpOM052WFhMd2JDeUhIQTVVR2tSSndSZnFuNFFqQzRlZlBFZlZTUE1WTjJBaWszLzFHbCtRbGRWSzMxS1BNTTZhCjRrdUI1WVBSejZ4Z1BkKzN6cDdwSmlDZ3NOL0I1TWpWSFQxTVVjV1A5SzNHZUNldkV0Y2VDUStWTEZhU3hNQ3AKcXU0NHQySVplYzI2TmRzRHhVR3lRU0U9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0KIiwiY2xpZW50X2VtYWlsIjoicmV2aWV3LXdyaXRlckBwb3dlcmZ1bC1nZW5yZS00NjQ1MDYtdDYuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLCJjbGllbnRfaWQiOiIxMTcwOTY4MzU3NTA5MTk4MDMzNDciLCJhdXRoX3VyaSI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwidG9rZW5fdXJpIjoiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLCJjbGllbnRfeDUwOV9jZXJ0X3VybCI6Imh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvcmV2aWV3LXdyaXRlciU0MHBvd2VyZnVsLWdlbnJlLTQ2NDUwNi10Ni5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInVuaXZlcnNlX2RvbWFpbiI6Imdvb2dsZWFwaXMuY29tIn0K";
    
    // 테스트: 자격증명 디코딩
    const credentialsJson = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);
    
    // 테스트: Google Auth 생성
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // 테스트: Sheets 객체 생성
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 테스트: 간단한 API 호출
    const testResult = await sheets.spreadsheets.get({
      spreadsheetId: body.spreadsheetId || '1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM'
    });
    
    return NextResponse.json({
      success: true,
      message: '테스트 성공',
      spreadsheetTitle: testResult.data.properties?.title,
      sheets: testResult.data.sheets?.map(sheet => sheet.properties?.title)
    })
  } catch (error: any) {
    console.error('테스트 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}