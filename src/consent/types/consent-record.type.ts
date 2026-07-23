import { ConsentScope, ConsentType } from '@prisma/client';

/// 저장소 계층에 전달되는 개별 약관 동의 upsert 입력 형태입니다.
export interface ConsentRecordInput {
  type: ConsentType;
  scope: ConsentScope;
  isAgreed: boolean;
  version: string;
}
