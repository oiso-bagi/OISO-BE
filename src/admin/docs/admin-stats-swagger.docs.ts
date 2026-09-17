import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AdminKtoCollectResponseDto,
  AdminKtoPlaceCollectResponseDto,
  AdminKtoPlaceStatusResponseDto,
  AdminKtoRelatedCollectResponseDto,
  AdminKtoRelatedStatusResponseDto,
  AdminKtoStatusResponseDto,
} from '@/admin/dto/admin-kto-status-response.dto';
import {
  AdminSavingsBreakdownResponseDto,
  AdminStatsOverviewResponseDto,
} from '@/admin/dto/admin-stats-response.dto';

export const ApiAdminStatsControllerDocs = () => ApiTags('Admin Stats & KTO');

const applyAdminAuthDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description:
        '인증 토큰이 유효하지 않거나 권한이 없습니다 (401 Unauthorized)',
    }),
  );

export const ApiGetAdminStatsOverviewDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '대시보드 KPI 카드 4종 통계 조회 (관리자)',
      description:
        '총 가입 유저 수, 누적 저장 루트 수, 누적 절약 금액 합계(원), 누적 로컬 기여 지수 평균(0~100점)을 조회합니다.',
    }),
    ApiOkResponse({
      description: '대시보드 KPI 카드 통계 데이터 반환',
      type: AdminStatsOverviewResponseDto,
    }),
  );

export const ApiGetAdminSavingsBreakdownDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: '상권/카테고리별 지출 절약 비율 요약 조회 (관리자)',
      description:
        '전통시장, 식당, 카페, 로컬 상권 등 카테고리별 절약 지출액 및 비율(%) 요약 데이터를 절약액 내림차순으로 조회합니다.',
    }),
    ApiOkResponse({
      description: '상권/카테고리별 지출 절약 요약 데이터 반환',
      type: AdminSavingsBreakdownResponseDto,
    }),
  );

export const ApiGetAdminKtoStatusDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: 'KTO 혼잡도 크론 배치 상태 조회 (관리자)',
      description:
        '한국관광공사(KTO) API 일일 호출 사용량(쿼터 1,000건), 마지막 수집 성공 일시, 배치 작업 상태(IDLE/RUNNING)를 조회합니다.',
    }),
    ApiOkResponse({
      description: 'KTO 배치 상태 및 쿼터 정보 반환',
      type: AdminKtoStatusResponseDto,
    }),
  );

export const ApiCollectAdminKtoDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: 'KTO 혼잡도 데이터 수동 수집 실행 (관리자)',
      description:
        'KTO 경로 혼잡도 데이터를 수동으로 즉시 갱신 수집합니다. (과도한 호출 방지를 위한 10분 쿨타임 제한 적용)',
    }),
    ApiOkResponse({
      description: '수동 수집 결과 메시지 및 수집 건수 반환',
      type: AdminKtoCollectResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        '10분 쿨타임 미충족 또는 수집 작업 이미 진행 중 (429 Too Many Requests)',
    }),
    ApiServiceUnavailableResponse({
      description:
        '외부 KTO API 연동 실패 또는 전면 장애 (503 Service Unavailable)',
    }),
  );

export const ApiGetAdminKtoPlaceStatusDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: 'KTO 관광지 마스터 배치 상태 조회 (관리자)',
      description:
        '한국관광공사(KorService2) 관광지 마스터 API 일일 호출 사용량, 마지막 수집 성공 일시, 배치 작업 상태(IDLE/RUNNING) 및 전체 부산 장소 수를 조회합니다.',
    }),
    ApiOkResponse({
      description: 'KTO 관광지 마스터 배치 상태 및 쿼터 정보 반환',
      type: AdminKtoPlaceStatusResponseDto,
    }),
  );

export const ApiCollectAdminKtoPlaceDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: 'KTO 관광지 마스터 데이터 수동 즉시 수집 실행 (관리자)',
      description:
        '한국관광공사(KorService2) 관광지 마스터 데이터를 수동으로 즉시 동기화 수집합니다. (과도한 호출 방지를 위한 10분 쿨타임 제한 적용)',
    }),
    ApiOkResponse({
      description: '관광지 마스터 수동 수집 결과 메시지 및 갱신 건수 반환',
      type: AdminKtoPlaceCollectResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        '10분 쿨타임 미충족 또는 수집 작업 이미 진행 중 (429 Too Many Requests)',
    }),
    ApiServiceUnavailableResponse({
      description:
        '외부 KTO API 연동 실패 또는 전면 장애 (503 Service Unavailable)',
    }),
  );

export const ApiGetAdminKtoRelatedStatusDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: 'KTO 연관관광지 배치 상태 조회 (관리자)',
      description:
        '한국관광공사(TarRlteTarService1) 연관관광지 빅데이터 API 일일 호출 사용량, 마지막 수집 성공 일시, 배치 작업 상태(IDLE/RUNNING) 및 DB 매칭 장소 수를 조회합니다.',
    }),
    ApiOkResponse({
      description: 'KTO 연관관광지 배치 상태 및 쿼터 정보 반환',
      type: AdminKtoRelatedStatusResponseDto,
    }),
  );

export const ApiCollectAdminKtoRelatedDocs = () =>
  applyDecorators(
    applyAdminAuthDocs(),
    ApiOperation({
      summary: 'KTO 연관관광지 데이터 수동 즉시 수집 실행 (관리자)',
      description:
        '한국관광공사(TarRlteTarService1) 연관관광지 빅데이터를 수동으로 즉시 동기화 수집합니다. (과도한 호출 방지를 위한 10분 쿨타임 제한 적용)',
    }),
    ApiOkResponse({
      description: '연관관광지 수동 수집 결과 메시지 및 갱신 건수 반환',
      type: AdminKtoRelatedCollectResponseDto,
    }),
    ApiTooManyRequestsResponse({
      description:
        '10분 쿨타임 미충족 또는 수집 작업 이미 진행 중 (429 Too Many Requests)',
    }),
    ApiServiceUnavailableResponse({
      description:
        '외부 KTO API 연동 실패 또는 전면 장애 (503 Service Unavailable)',
    }),
  );
