import { ApiProperty } from '@nestjs/swagger';

/// 약관 동의 제출(POST /api/v1/consents) 요청 바디 형태입니다.
export class SubmitConsentRequestDto {
  @ApiProperty({
    description: '동의 대상 약관 문서 버전',
    example: 'v1.0.0',
  })
  version!: string; /// 동의 대상 약관 문서 버전 (예: v1.0.0)

  @ApiProperty({
    description: '이용약관 동의 여부. 필수 약관이므로 true여야 합니다.',
    example: true,
  })
  terms!: boolean; /// 이용약관 동의 여부 (필수)

  @ApiProperty({
    description:
      '개인정보 수집·이용 동의 여부. 필수 약관이므로 true여야 합니다.',
    example: true,
  })
  privacy!: boolean; /// 개인정보 수집·이용 동의 여부 (필수)

  @ApiProperty({
    description:
      '만 14세 이상 확인 동의 여부. 필수 약관이므로 true여야 합니다.',
    example: true,
  })
  age!: boolean; /// 만 14세 이상 확인 동의 여부 (필수)

  @ApiProperty({
    description: '마케팅 정보 수신 동의 여부. 선택 약관입니다.',
    example: false,
  })
  marketing!: boolean; /// 마케팅 정보 수신 동의 여부 (선택)

  @ApiProperty({
    description: '위치기반 서비스 이용약관 동의 여부. 선택 약관입니다.',
    example: false,
  })
  location!: boolean; /// 위치기반 서비스 이용약관 동의 여부 (선택)
}
