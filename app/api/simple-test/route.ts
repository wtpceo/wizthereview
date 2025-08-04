import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  try {
    console.log('Simple test started')
    
    // 하드코딩된 자격증명으로 직접 테스트
    const credentials = {
      type: "service_account",
      project_id: "powerful-genre-464506-t6",
      private_key_id: "2c00c120a0901a24b6121555e0bee83baee7f1",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDdk4sUyy11K8X4\ndtY7krAWF6a4NQTb7THA6EfMGufBW1YeoZft8zAEMkd4HdgUen233XlJRhB9r/20\n/XsrfxWhn7tIx8EmIpjEvZX3K2qG20J0Wg2a3MipAhHUNKQC0hUqmijteB/XPGo\nIHBMD53Gmq1veZ/yPrlsyqUv7sngV9e/YchXOBOTaKqLQ+XrcQewgXcvsxN/hEFV\nRI++XWa+i0x+fUKq3HouLMra6ks4qQhzwCgTLSSLtWdDX5mKYqOcV6YmeEYZjQAA\nHMKh7E6W8m+DE8UR1LRgbDznJphduoM9LEbEFb6xGIY4xdSe6YiyzplvWBQ+ICTg\nAfByYk9vAgMBAAECggEADCDDIu27Z2ebIUOb6/crpTdBMbb735p8N9i0SVi/pCP\nG65w9Z4d2YpI/YBLWf+Zua0pMi4KwV5shBzAbPvlRWChVyqmiKhUdVGtOjIJqtJT\nMQbW1MxTPWZMGdyRwkfDzyj7UYLaXw6ezuWLpVYmJtSY5qT2cMN8fGxxHeOzmrsK\nEmzZfp1HEN+iXFyMwFyg9KED1g3RA5WrYSih5QYhP+w1MSKtM87SYLIwf0DUjKGA\n1eBInbxxtN5jIM5bqpxWq5FwXReHhykJxQR50WMFBZFFVAdxVyJ9lDph4E9IK8I8\nfoML4+wefkS6/7mp8iGlkhzuuFkvr7OsLLDZ5B9nvQKBgQD06Mqx0IuCcdoLnKSS\n08l0BZzERm3JX4Gf1RarBoaNaNm2dtBpCo8QOi8X87hjeYCp9k4HmaeMuLMV2s6+\nmfGQiKKyPQo0OJm4bE/8CyD5ViWIWxvxpeveVJ1gv8QM6VZVb7nhlqE42ba9o4or\niHGF9cd6Nn4SC9HuEDIf3WrmawKBgQDnnEElVkTTA7M9B+Ri7hGmoeQ5wF4JYTmr\nCk5uqxxT2osr3HX7Sbv7Q48LcrDwJZZVeIx8LY+TkUxrXyiRgZ9h8Un7Eenqh+e8\nO3GbLETgAVj0DUglKkoCQNvytybA87zhTgVU98mh2TKdmat/bTsS63mCThDTo3Qn\nWNsDaGzUDQKBgQCsSuz15QmQTjogOyXIKXgqyBv+NLHdnfPaFpWo4aFc8CthYvrB\nOu1kdBpXVl0clgi/CQjh7eXiaLmMIV+axUAc9xLGI4z/KeZyyLgIT2f2IPWslLP2\n70wdEBfbTW1FzA2xczUoj8iB7x/RD7EOAPAkVsDrqFROq8QXH4uzwRgIWwKBgBut\nuLtVi/QLxSfOAaUw/jsDrdqY+qP0Uof2O1lOaZw7ydX8Cr11Gln0wOuFUU/hrg2Y\n0nEkoLvp6VALlzWMYBe8VjMC+QlmJHOCRxlcOP7sKk1AKRcH7sBGMALZkHAOsMvc\nHxcAZcBJzJq4+p3H1/9y1JqV6bzhE8h//exyVk8hAoGAHSVvT1ek+ydGYkVwpfIv\nN3NvXXLwbCyHHA5UGkRJwRfqn4QjC4efPEfVSPMVN2Aik3/1Gl+QldVK31KPMM6a\n4kuB5YPRz6xgPd+3zp7pJiCgsN/B5MjVHT1MUcWP9K3GeCevEtceCQ+VLFaSxMCp\nqu44t2IZec26NdsDxUGyQSE=\n-----END PRIVATE KEY-----\n",
      client_email: "review-writer@powerful-genre-464506-t6.iam.gserviceaccount.com",
      client_id: "117096835750919803347",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/review-writer%40powerful-genre-464506-t6.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    }
    
    console.log('Creating auth...')
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    
    console.log('Creating sheets client...')
    const sheets = google.sheets({ version: 'v4', auth })
    
    console.log('Testing sheets API...')
    const response = await sheets.spreadsheets.get({
      spreadsheetId: '1QRNRaKjMaTgAcpSyjz-IeckdtcX2oNDxx13fe4vI5YM'
    })
    
    return NextResponse.json({
      success: true,
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map(s => s.properties?.title)
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}