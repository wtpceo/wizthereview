"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileSpreadsheet, RefreshCw } from 'lucide-react'

export default function TestSheetsPage() {
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleTest = async () => {
    if (!spreadsheetId.trim()) {
      setResult({ success: false, error: '구글 시트 ID를 입력해주세요.' })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      console.log('🔄 구글 시트 동기화 테스트 시작...')
      
      const response = await fetch('/api/sync-google-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'all',
          spreadsheetId: spreadsheetId.trim()
        })
      })

      const data = await response.json()
      setResult(data)
      
      console.log('테스트 결과:', data)

    } catch (error: any) {
      console.error('테스트 실패:', error)
      setResult({ 
        success: false, 
        error: '네트워크 오류가 발생했습니다.' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">구글 시트 동기화 테스트</h1>
        <p className="text-gray-600">
          광고주 플랫폼 정보를 구글 시트에 동기화하는 기능을 테스트할 수 있습니다.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>테스트 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="spreadsheetId">구글 시트 ID</Label>
            <Input
              id="spreadsheetId"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="구글 시트 URL에서 ID 부분을 복사해주세요"
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              예: https://docs.google.com/spreadsheets/d/<strong>1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms</strong>/edit
            </p>
          </div>

          <Button 
            onClick={handleTest}
            disabled={isLoading || !spreadsheetId.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                동기화 중...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                테스트 실행
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
              테스트 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={`
              ${result.success 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
              }
            `}>
              <AlertDescription className={`
                ${result.success ? 'text-green-800' : 'text-red-800'}
              `}>
                {result.success ? '✅ ' : '❌ '}
                {result.message || result.error}
              </AlertDescription>
            </Alert>

            {result.success && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">동기화 완료!</h4>
                <p className="text-sm text-blue-800">
                  구글 시트를 확인해보세요. 플랫폼별로 다음 탭에 데이터가 추가되었습니다:
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• 네이버플레이스 → '네이버 플레이스' 탭</li>
                  <li>• 배달의민족 → '배민' 탭</li>
                  <li>• 쿠팡이츠 → '쿠팡' 탭</li>
                  <li>• 요기요 → '요기요' 탭</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>사용 전 준비사항</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">1. 구글 시트 생성</h4>
              <p className="text-gray-600">
                구글 시트를 생성하고 '리뷰프로그램' 제목으로 설정하세요.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. 서비스 계정 권한 추가</h4>
              <p className="text-gray-600">
                구글 시트에 <code className="bg-gray-100 px-2 py-1 rounded">review-writer@powerful-genre-464506-t6.iam.gserviceaccount.com</code> 
                계정을 편집자로 추가하세요.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. 필요한 탭 생성</h4>
              <p className="text-gray-600">
                다음 이름의 탭들을 미리 생성해두세요:
              </p>
              <ul className="mt-2 space-y-1 text-gray-600">
                <li>• 네이버 플레이스</li>
                <li>• 배민</li>
                <li>• 쿠팡</li>
                <li>• 요기요</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 