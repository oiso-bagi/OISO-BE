/// 약관 동의 제출(POST /api/v1/consents) 요청 바디 형태입니다.
export class SubmitConsentRequestDto {
  version!: string; /// 동의 대상 약관 문서 버전 (예: v1.0.0)
  terms!: boolean; /// 이용약관 동의 여부 (필수)
  privacy!: boolean; /// 개인정보 수집·이용 동의 여부 (필수)
  age!: boolean; /// 만 14세 이상 확인 동의 여부 (필수)
  marketing!: boolean; /// 마케팅 정보 수신 동의 여부 (선택)
  location!: boolean; /// 위치기반 서비스 이용약관 동의 여부 (선택)
}
