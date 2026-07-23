import { Injectable } from '@nestjs/common';
import { UserConsent } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentRecordInput } from '../types/consent-record.type';

@Injectable()
export class ConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUserId(userId: string): Promise<UserConsent[]> {
    return this.prisma.userConsent.findMany({
      where: { userId },
      orderBy: { type: 'asc' },
    });
  }

  /**
   * 유저의 약관 동의 항목들을 (userId, type, version) 단위로 upsert합니다.
   * 이미 같은 버전에 동의 이력이 있으면 동의 여부만 갱신하고, 철회 시 revokedAt을 기록합니다.
   */
  async upsertMany(
    userId: string,
    records: ConsentRecordInput[],
  ): Promise<UserConsent[]> {
    return this.prisma.$transaction(
      records.map((record) =>
        this.prisma.userConsent.upsert({
          where: {
            userId_type_version: {
              userId,
              type: record.type,
              version: record.version,
            },
          },
          create: {
            userId,
            type: record.type,
            scope: record.scope,
            isAgreed: record.isAgreed,
            version: record.version,
          },
          update: {
            isAgreed: record.isAgreed,
            revokedAt: record.isAgreed ? null : new Date(),
          },
        }),
      ),
    );
  }
}
