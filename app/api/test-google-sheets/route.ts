import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Google Sheets API 테스트 엔드포인트',
    timestamp: new Date().toISOString(),
    env: {
      hasGoogleServiceAccountKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasGoogleSheetsSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    }
  })
}