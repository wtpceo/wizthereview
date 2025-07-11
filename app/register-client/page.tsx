'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, FileText, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const PLATFORMS = [
  { value: '네이버플레이스', label: '네이버플레이스' },
  { value: '배달의민족', label: '배달의민족' },
  { value: '쿠팡이츠', label: '쿠팡이츠' },
  { value: '요기요', label: '요기요' },
  { value: '땡겨요', label: '땡겨요' },
  { value: '배달이음', label: '배달이음' },
  { value: '카카오매장', label: '카카오매장' },
];

interface PlatformInfo {
  platform_name: string;
  platform_id: string;
  platform_password: string;
  shop_id?: string;
  answer_guide?: string;
}

interface FileInfo {
  file: File;
  type: 'id_card' | 'contract' | 'cms_application';
}

export default function RegisterClientPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 단계별 입력을 위한 상태
  const [isCompleted, setIsCompleted] = useState(false); // 등록 완료 상태
  const [formData, setFormData] = useState({
    store_name: '',
    business_number: '',
    owner_phone: '',
    contract_months: '12',
    memo: '',
    guide: '',
    service: '',
  });
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [files, setFiles] = useState<FileInfo[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPlatform = () => {
    if (platforms.length >= 7) {
      toast({
        title: '플랫폼 추가 제한',
        description: '최대 7개까지만 추가할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }
    setPlatforms(prev => [...prev, {
      platform_name: '',
      platform_id: '',
      platform_password: '',
      shop_id: '',
      answer_guide: '',
    }]);
  };

  const handlePlatformChange = (index: number, field: keyof PlatformInfo, value: string) => {
    setPlatforms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemovePlatform = (index: number) => {
    setPlatforms(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (type: 'id_card' | 'contract' | 'cms_application') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: '파일 크기 초과',
            description: '파일 크기는 10MB 이하여야 합니다.',
            variant: 'destructive',
          });
          return;
        }
        
        setFiles(prev => {
          const filtered = prev.filter(f => f.type !== type);
          return [...filtered, { file, type }];
        });
      }
    };
    input.click();
  };

  const handleFileRemove = (type: string) => {
    setFiles(prev => prev.filter(f => f.type !== type));
  };

  const getFileName = (type: string) => {
    const fileInfo = files.find(f => f.type === type);
    return fileInfo?.file.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // FormData 생성 (파일 업로드를 위해)
      const submitData = new FormData();
      
      // 기본 정보 추가
      submitData.append('clientData', JSON.stringify({
        ...formData,
        contract_months: parseInt(formData.contract_months),
        platforms,
      }));
      
      // 파일 추가
      files.forEach(fileInfo => {
        submitData.append(fileInfo.type, fileInfo.file);
      });

      const response = await fetch('/api/register-client', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: '광고주 등록 완료',
          description: '광고주가 성공적으로 등록되었습니다.',
        });
        
        // 폼 초기화
        setFormData({
          store_name: '',
          business_number: '',
          owner_phone: '',
          contract_months: '12',
          memo: '',
          guide: '',
          service: '',
        });
        setPlatforms([]);
        setFiles([]);
        setIsCompleted(true);
        setCurrentStep(1);
      } else {
        toast({
          title: '등록 실패',
          description: result.error || '광고주 등록에 실패했습니다.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '네트워크 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 등록 완료 화면
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 py-4">
        <div className="container mx-auto max-w-lg px-4">
          <Card className="shadow-none border-0">
            <CardContent className="px-6 py-12 text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">등록 완료!</h2>
              <p className="text-gray-600 mb-8">광고주가 성공적으로 등록되었습니다.</p>
              <Button
                onClick={() => {
                  setIsCompleted(false);
                  setFormData({
                    store_name: '',
                    business_number: '',
                    owner_phone: '',
                    contract_months: '12',
                    memo: '',
                    guide: '',
                    service: '',
                  });
                  setPlatforms([]);
                  setFiles([]);
                }}
                className="h-12 px-8"
              >
                새로운 광고주 등록하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="container mx-auto max-w-lg px-4">
        <Card className="shadow-none border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">광고주 등록</CardTitle>
            <CardDescription className="text-center text-sm">
              {currentStep === 1 && "기본 정보를 입력해주세요"}
              {currentStep === 2 && "플랫폼 정보를 입력해주세요 (선택사항)"}
              {currentStep === 3 && "파일을 업로드해주세요 (선택사항)"}
            </CardDescription>
            
            {/* 진행 상태 표시 */}
            <div className="flex justify-center mt-4 space-x-2">
              <div className={`h-2 w-20 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`h-2 w-20 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`h-2 w-20 rounded-full ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1단계: 기본 정보 */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store_name" className="text-base font-medium">매장명 *</Label>
                    <Input
                      id="store_name"
                      name="store_name"
                      value={formData.store_name}
                      onChange={handleInputChange}
                      required
                      placeholder="매장명을 입력하세요"
                      className="h-12 text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business_number" className="text-base font-medium">사업자등록번호 *</Label>
                    <Input
                      id="business_number"
                      name="business_number"
                      value={formData.business_number}
                      onChange={handleInputChange}
                      required
                      placeholder="000-00-00000"
                      className="h-12 text-base"
                      type="tel"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="owner_phone" className="text-base font-medium">사장님 휴대폰번호 *</Label>
                    <Input
                      id="owner_phone"
                      name="owner_phone"
                      value={formData.owner_phone}
                      onChange={handleInputChange}
                      required
                      placeholder="010-0000-0000"
                      className="h-12 text-base"
                      type="tel"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contract_months" className="text-base font-medium">계약 개월수 *</Label>
                    <Input
                      id="contract_months"
                      name="contract_months"
                      type="number"
                      min="1"
                      max="120"
                      value={formData.contract_months}
                      onChange={handleInputChange}
                      required
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service" className="text-base font-medium">서비스</Label>
                    <Input
                      id="service"
                      name="service"
                      value={formData.service}
                      onChange={handleInputChange}
                      placeholder="제공할 서비스를 입력하세요"
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guide" className="text-base font-medium">지침</Label>
                    <Textarea
                      id="guide"
                      name="guide"
                      value={formData.guide}
                      onChange={handleInputChange}
                      placeholder="광고주 관리 지침을 입력하세요"
                      rows={3}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="memo" className="text-base font-medium">메모</Label>
                    <Textarea
                      id="memo"
                      name="memo"
                      value={formData.memo}
                      onChange={handleInputChange}
                      placeholder="추가 메모사항을 입력하세요"
                      rows={3}
                      className="text-base"
                    />
                  </div>
                </div>
              )}

              {/* 2단계: 플랫폼 정보 */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">플랫폼 정보 (선택)</h3>
                    <Button
                      type="button"
                      onClick={handleAddPlatform}
                      variant="outline"
                      size="sm"
                      className="h-10 px-4"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      플랫폼 추가
                    </Button>
                  </div>

                {platforms.map((platform, index) => (
                  <Card key={index} className="p-4 bg-gray-50 border-gray-200">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">플랫폼 {index + 1}</h4>
                        <Button
                          type="button"
                          onClick={() => handleRemovePlatform(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 h-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-sm">플랫폼명</Label>
                          <Select
                            value={platform.platform_name}
                            onValueChange={(value) => handlePlatformChange(index, 'platform_name', value)}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="플랫폼 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORMS.map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">플랫폼 아이디</Label>
                          <Input
                            value={platform.platform_id}
                            onChange={(e) => handlePlatformChange(index, 'platform_id', e.target.value)}
                            placeholder="플랫폼 아이디"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">플랫폼 비밀번호</Label>
                          <Input
                            type="password"
                            value={platform.platform_password}
                            onChange={(e) => handlePlatformChange(index, 'platform_password', e.target.value)}
                            placeholder="플랫폼 비밀번호"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">샵 아이디</Label>
                          <Input
                            value={platform.shop_id || ''}
                            onChange={(e) => handlePlatformChange(index, 'shop_id', e.target.value)}
                            placeholder="샵 아이디 (선택)"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">답변 지침</Label>
                          <Textarea
                            value={platform.answer_guide || ''}
                            onChange={(e) => handlePlatformChange(index, 'answer_guide', e.target.value)}
                            placeholder="이 플랫폼에 대한 답변 지침"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                </div>
              )}

              {/* 3단계: 파일 업로드 */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold mb-4">파일 업로드 (선택)</h3>
                <div className="space-y-3">
                  <Card className="p-4 bg-gray-50 border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <h4 className="font-medium text-sm">신분증</h4>
                        </div>
                        {getFileName('id_card') && (
                          <Button
                            type="button"
                            onClick={() => handleFileRemove('id_card')}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {getFileName('id_card') ? (
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <span className="text-sm truncate block">{getFileName('id_card')}</span>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handleFileSelect('id_card')}
                          variant="outline"
                          className="w-full h-12"
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          파일 선택
                        </Button>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4 bg-gray-50 border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-purple-500" />
                          <h4 className="font-medium text-sm">계약서</h4>
                        </div>
                        {getFileName('contract') && (
                          <Button
                            type="button"
                            onClick={() => handleFileRemove('contract')}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {getFileName('contract') ? (
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <span className="text-sm truncate block">{getFileName('contract')}</span>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handleFileSelect('contract')}
                          variant="outline"
                          className="w-full h-12"
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          파일 선택
                        </Button>
                      )}
                    </div>
                  </Card>

                  <Card className="p-4 bg-gray-50 border-gray-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-orange-500" />
                          <h4 className="font-medium text-sm">CMS 신청서</h4>
                        </div>
                        {getFileName('cms_application') && (
                          <Button
                            type="button"
                            onClick={() => handleFileRemove('cms_application')}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {getFileName('cms_application') ? (
                        <div className="bg-white rounded p-3 border border-gray-200">
                          <span className="text-sm truncate block">{getFileName('cms_application')}</span>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => handleFileSelect('cms_application')}
                          variant="outline"
                          className="w-full h-12"
                        >
                          <Upload className="h-5 w-5 mr-2" />
                          파일 선택
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>
                <div className="text-sm text-gray-500">
                  지원 파일 형식: JPG, PNG, WebP, PDF, DOC, DOCX (최대 10MB)
                </div>
                </div>
              )}

              {/* 하단 버튼 */}
              <div className="flex justify-between items-center pt-4">
                <div>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      variant="outline"
                      className="h-12 px-6"
                    >
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      이전
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  {currentStep < 3 && (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                    >
                      다음
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </Button>
                  )}
                  
                  {currentStep === 3 && (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-12 px-8 bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          등록 중...
                        </>
                      ) : (
                        '광고주 등록 완료'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}