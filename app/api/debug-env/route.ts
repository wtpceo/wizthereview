import { NextResponse } from 'next/server'

export async function GET() {
  // 환경 변수 디버깅
  const envInfo = {
    hasGoogleServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    hasGoogleSheetsSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    googleServiceAccountKeyLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0,
    googleSheetsSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 'not set',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    // 첫 50자만 표시 (보안을 위해)
    googleServiceAccountKeyPreview: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.substring(0, 50) + '...' || 'not set',
    allGoogleEnvKeys: Object.keys(process.env).filter(key => key.includes('GOOGLE')),
  }

  return NextResponse.json({
    message: '환경 변수 디버깅 정보',
    envInfo
  })
}