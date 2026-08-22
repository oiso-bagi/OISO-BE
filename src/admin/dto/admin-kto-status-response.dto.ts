import { ApiProperty } from '@nestjs/swagger';

export class AdminKtoStatusResponseDto {
  @ApiProperty({
    description: '오늘 KTO API 호출 사용량 (쿼터 1,000건 한도)',
    example: 142,
  })
  dailyApiUsage!: number;

  @ApiProperty({ description: '일일 최대 허용 쿼터 수', example: 1000 })
  dailyQuotaLimit!: number;

  @ApiProperty({
    description: '마지막 수집 성공 일시',
    example: '2026-08-17T04:00:00.000Z',
    nullable: true,
  })
  lastCollectedAt!: Date | null;

  @ApiProperty({
    description: '현재 수집 작업 상태 (IDLE | RUNNING)',
    example: 'IDLE',
  })
  status!: 'IDLE' | 'RUNNING';

  @ApiProperty({
    description:
      '마지막 수집 실행 결과 상태 (SUCCESS | PARTIAL_SUCCESS | FAILURE)',
    enum: ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE'],
    example: 'SUCCESS',
    nullable: true,
  })
  lastResult!: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' | null;

  @ApiProperty({
    description: '마지막 수집 실행 결과 메시지',
    example: 'KTO 경로 혼잡도 수동 수집이 성공적으로 완료되었습니다.',
    nullable: true,
  })
  lastMessage!: string | null;

  @ApiProperty({ description: '혼잡도 수집 대상 장소 수', example: 85 })
  targetPlaceCount!: number;
}

export class AdminKtoCollectResponseDto {
  @ApiProperty({
    description: '수동 수집 실행 결과 메시지',
    example: 'KTO 경로 혼잡도 수동 수집이 성공적으로 완료되었습니다.',
  })
  message!: string;

  @ApiProperty({
    description: '수집 실행 완료 일시',
    example: '2026-08-17T17:45:00.000Z',
  })
  collectedAt!: Date;

  @ApiProperty({ description: '갱신된 장소 건수', example: 85 })
  updatedPlaceCount!: number;

  @ApiProperty({ description: '갱신 실패한 장소 건수', example: 0 })
  failureCount!: number;
}
