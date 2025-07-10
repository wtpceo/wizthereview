'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Download, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ExcelData {
  store_name: string
  naver_id?: string
  naver_password?: string
  naver_shop_id?: string
  baemin_id?: string
  baemin_password?: string
  baemin_shop_id?: string
  coupang_id?: string
  coupang_password?: string
  coupang_shop_id?: string
  yogiyo_id?: string
  yogiyo_password?: string
  yogiyo_shop_id?: string
  ddangyo_id?: string
  ddangyo_password?: string
  ddangyo_shop_id?: string
}

interface ExcelUploadProps {
  onUpload: (data: ExcelData[]) => void
  agencyId: number
}

export default function ExcelUpload({ onUpload, agencyId }: ExcelUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ExcelData[]>([])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setLoading(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<ExcelData>(worksheet)

        // 데이터 검증
        if (jsonData.length === 0) {
          setError('엑셀 파일에 데이터가 없습니다.')
          setLoading(false)
          return
        }

        // 필수 필드 확인
        const validData = jsonData.filter(row => row.store_name)
        if (validData.length === 0) {
          setError('업체명(store_name)은 필수 입력 항목입니다.')
          setLoading(false)
          return
        }

        setPreview(validData)
        setLoading(false)
      } catch (err) {
        setError('엑셀 파일을 읽는 중 오류가 발생했습니다.')
        setLoading(false)
      }
    }

    reader.readAsBinaryString(file)
  }

  const handleUploadConfirm = async () => {
    if (preview.length === 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/clients/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agencyId,
          clients: preview
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '업로드 중 오류가 발생했습니다.')
      }

      onUpload(preview)
      setPreview([])
      setError(null)
      
      // 입력 필드 초기화
      const fileInput = document.getElementById('excel-upload') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const ws_data = [
      ['store_name', 'naver_id', 'naver_password', 'naver_shop_id', 'baemin_id', 'baemin_password', 'baemin_shop_id', 'coupang_id', 'coupang_password', 'coupang_shop_id', 'yogiyo_id', 'yogiyo_password', 'yogiyo_shop_id', 'ddangyo_id', 'ddangyo_password', 'ddangyo_shop_id'],
      ['예시업체명', 'naver123', 'password123', 'shop123', 'baemin456', 'pass456', 'shop456', '', '', '', '', '', '', '', '', '']
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(ws_data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '광고주정보')
    
    XLSX.writeFile(wb, '광고주정보_템플릿.xlsx')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>엑셀 파일 업로드</CardTitle>
        <CardDescription>
          여러 광고주 정보를 엑셀 파일로 한번에 등록할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            템플릿 다운로드
          </Button>
          
          <div className="flex-1">
            <label htmlFor="excel-upload" className="cursor-pointer">
              <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    엑셀 파일을 선택하거나 드래그하세요
                  </p>
                  <p className="text-xs text-gray-500">
                    .xlsx, .xls 파일 지원
                  </p>
                </div>
              </div>
              <input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {preview.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">미리보기 ({preview.length}개 항목)</h3>
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">업체명</th>
                    <th className="px-4 py-2 text-left">네이버</th>
                    <th className="px-4 py-2 text-left">배민</th>
                    <th className="px-4 py-2 text-left">쿠팡</th>
                    <th className="px-4 py-2 text-left">요기요</th>
                    <th className="px-4 py-2 text-left">땡겨요</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{row.store_name}</td>
                      <td className="px-4 py-2">{row.naver_id ? '✓' : '-'}</td>
                      <td className="px-4 py-2">{row.baemin_id ? '✓' : '-'}</td>
                      <td className="px-4 py-2">{row.coupang_id ? '✓' : '-'}</td>
                      <td className="px-4 py-2">{row.yogiyo_id ? '✓' : '-'}</td>
                      <td className="px-4 py-2">{row.ddangyo_id ? '✓' : '-'}</td>
                    </tr>
                  ))}
                  {preview.length > 10 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                        ... 외 {preview.length - 10}개 항목
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPreview([])
                  setError(null)
                  const fileInput = document.getElementById('excel-upload') as HTMLInputElement
                  if (fileInput) {
                    fileInput.value = ''
                  }
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleUploadConfirm}
                disabled={loading}
              >
                {loading ? '업로드 중...' : `${preview.length}개 항목 등록`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}