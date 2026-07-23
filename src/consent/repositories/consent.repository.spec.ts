import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentRepository } from './consent.repository';

describe('ConsentRepository', () => {
  let repository: ConsentRepository;
  let prismaService: {
    userConsent: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      userConsent: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<ConsentRepository>(ConsentRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('calls prisma.userConsent.findMany scoped to the given userId', async () => {
    const mockRows = [{ id: 'consent-1', userId: 'user-id' }];
    prismaService.userConsent.findMany.mockResolvedValue(mockRows);

    const result: unknown = await repository.findAllByUserId('user-id');

    expect(result).toBe(mockRows);
    expect(prismaService.userConsent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-id' } }),
    );
  });

  it('upserts each record inside a single transaction keyed by userId/type/version', async () => {
    const records = [
      {
        type: 'TERMS' as const,
        scope: 'REQUIRED' as const,
        isAgreed: true,
        version: 'v1.0.0',
      },
      {
        type: 'MARKETING' as const,
        scope: 'OPTIONAL' as const,
        isAgreed: false,
        version: 'v1.0.0',
      },
    ];
    const upsertedRows = records.map((record) => ({
      ...record,
      id: `consent-${record.type}`,
    }));
    prismaService.$transaction.mockResolvedValue(upsertedRows);

    const result: unknown = await repository.upsertMany('user-id', records);

    expect(result).toBe(upsertedRows);
    expect(prismaService.$transaction).toHaveBeenCalledWith(expect.any(Array));

    const transactionCalls = prismaService.$transaction.mock.calls as Array<
      [unknown[]]
    >;
    const transactionArg = transactionCalls[0][0];
    expect(transactionArg).toHaveLength(2);
    expect(prismaService.userConsent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_version: {
            userId: 'user-id',
            type: 'TERMS',
            version: 'v1.0.0',
          },
        },
        create: {
          userId: 'user-id',
          type: 'TERMS',
          scope: 'REQUIRED',
          isAgreed: true,
          version: 'v1.0.0',
        },
        update: { isAgreed: true, revokedAt: null },
      }),
    );
    const upsertCalls = prismaService.userConsent.upsert.mock.calls as Array<
      [{ update: { isAgreed: boolean; revokedAt: Date | null } }]
    >;
    const revokeCallArgs = upsertCalls[1][0];
    expect(revokeCallArgs.update.isAgreed).toBe(false);
    expect(revokeCallArgs.update.revokedAt).toBeInstanceOf(Date);
  });
});
