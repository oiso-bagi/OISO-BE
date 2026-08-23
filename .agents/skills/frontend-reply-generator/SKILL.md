---
name: frontend-reply-generator
description: 프론트엔드 팀원(또는 협업 팀원)의 질문 및 이슈 제보에 대해 백엔드 조치 완료 내용과 결과를 친절하고 간결한 마크다운 템플릿 메시지로 생성하는 스킬입니다. Use when generating concise, polite reply messages for frontend team members based on resolved backend issues or API inquiries.
---

# Frontend Reply Generator

## 목적
프론트엔드 팀원이 남긴 메시지(이슈 제보, DTO/API 문의, 타입 불일치 문의 등)를 기반으로, 백엔드에서의 해결 내용과 변경 결과를 간결하고 친절한 템플릿 양식으로 출력합니다.

---

## 📋 기본 답장 양식 (Reply Template)

```markdown
{인사말 및 이슈 해결 한 줄 요약} 🚀

- **수정사항**: {백엔드 수정 내용 및 원인 간결 요약}
- **결과**: {프론트엔드 관점의 API/타입/동작 변경 결과}

{마무리 인사 및 확인 요청 메시지} 🙌
```

---

## 🎯 작성 규칙 (Guidelines)

1. **간결성**: 장황한 긴 설명 대신 프론트엔드 팀원이 필요한 핵심만 3~4줄 내외로 빠르게 파악할 수 있도록 구성합니다.
2. **핵심 요소 명시**:
   - 첫 줄: 인사 + 🚀 이모지와 함께 해결 완료 요약
   - `- **수정사항**:` 백엔드에서 조치한 명확한 작업 1줄
   - `- **결과**:` 프론트엔드에 미치는 직관적인 영향(타입, DTO, 동작 등) 1줄
   - 끝 줄: 확인 요청 및 친절한 마무리 인사 (🙌 이모지 사용)
3. **톤앤매너**: 협업에 도움이 되는 매끄럽고 긍정적인 한국어 톤앤매너를 유지합니다.

---

## 💡 활용 예시 (Examples)

### 예시 1: Swagger 타입 생성 불일치 문의 시
```markdown
`POST /api/v1/recommended-routes/recommend` 추천 요청 API의 `travelStyleSlugs` Swagger 2차원 배열(`string[][]`) 중복 생성 이슈 해결 완료되었습니다! 🚀

- **수정사항**: 백엔드 DTO `@ApiProperty` 데코레이터의 중복 배열 선언을 교정했습니다.
- **결과**: 이제 `swagger-typescript-api` 도구로 타입을 자동 생성하시면 **`travelStyleSlugs: string[]`** 1차원 문자열 배열로 정상 생성됩니다.

서버 코드 반영되었으니 다시 타입 생성해 보시고 확인해 주시면 감사하겠습니다! 🙌
```

### 예시 2: 보관함 코스 저장 시 dayNumber 유실 문의 시
```markdown
제보해주신 조합 코스 보관함 저장 시 `dayNumber` 유실 이슈 해결되어 서버에 반영 완료되었습니다! 🚀

- **수정사항**: 조합 코스(`stitched-*`) 저장 시 `RouteStop` 생성을 위한 입력 타입 및 DB 영속화 쿼리에 `dayNumber`를 추가했습니다.
- **결과**: 보관함 저장 후 상세 조회(`GET /api/v1/routes/saved/:savedRouteId`) 시에도 1일차, 2일차, 3일차가 유실 없이 100% 정상 반환됩니다.

서버 업데이트 완료되었으니 편하게 다시 저장 후 지도 상세 확인 부탁드립니다! 감사해요! 🙌
```
