/// <reference types="jest" />

import { BadRequestException } from '@nestjs/common';
import { ConsentRepository } from '../repositories/consent.repository';
import { ConsentService } from './consent.service';

describe('ConsentService', () => {
  const mockConsentRepository = {
    findAllByUserId: jest.fn(),
    upsertMany: jest.fn(),
  };
  let service: ConsentService;

  const baseConsentRow = (type: string, scope: string, isAgreed: boolean) => ({
    id: `consent-${type}`,
    userId: 'user-id',
    type,
    scope,
    isAgreed,
    version: 'v1.0.0',
    agreedAt: new Date('2026-07-24T00:00:00.000Z'),
    revokedAt: null,
    createdAt: new Date('2026-07-24T00:00:00.000Z'),
  });

  const fullyAgreedRows = [
    baseConsentRow('TERMS', 'REQUIRED', true),
    baseConsentRow('PRIVACY', 'REQUIRED', true),
    baseConsentRow('AGE', 'REQUIRED', true),
    baseConsentRow('MARKETING', 'OPTIONAL', false),
    baseConsentRow('LOCATION', 'OPTIONAL', false),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConsentService(
      mockConsentRepository as unknown as ConsentRepository,
    );
  });

  it('returns consent status with hasCompletedRequiredConsents true when all required items are agreed', async () => {
    mockConsentRepository.findAllByUserId.mockResolvedValue(fullyAgreedRows);

    await expect(service.getConsentStatus('user-id')).resolves.toEqual(
      expect.objectContaining({ hasCompletedRequiredConsents: true }),
    );
  });

  it('returns hasCompletedRequiredConsents false when a required item is missing', async () => {
    mockConsentRepository.findAllByUserId.mockResolvedValue([
      baseConsentRow('TERMS', 'REQUIRED', true),
      baseConsentRow('PRIVACY', 'REQUIRED', false),
      baseConsentRow('AGE', 'REQUIRED', true),
    ]);

    await expect(service.getConsentStatus('user-id')).resolves.toEqual(
      expect.objectContaining({ hasCompletedRequiredConsents: false }),
    );
  });

  it('submits consents and upserts a record for each of the five consent types', async () => {
    mockConsentRepository.upsertMany.mockResolvedValue(fullyAgreedRows);

    await service.submitConsents('user-id', {
      version: 'v1.0.0',
      terms: true,
      privacy: true,
      age: true,
      marketing: false,
      location: false,
    });

    expect(mockConsentRepository.upsertMany).toHaveBeenCalledWith(
      'user-id',
      expect.arrayContaining([
        { type: 'TERMS', scope: 'REQUIRED', isAgreed: true, version: 'v1.0.0' },
        {
          type: 'PRIVACY',
          scope: 'REQUIRED',
          isAgreed: true,
          version: 'v1.0.0',
        },
        { type: 'AGE', scope: 'REQUIRED', isAgreed: true, version: 'v1.0.0' },
        {
          type: 'MARKETING',
          scope: 'OPTIONAL',
          isAgreed: false,
          version: 'v1.0.0',
        },
        {
          type: 'LOCATION',
          scope: 'OPTIONAL',
          isAgreed: false,
          version: 'v1.0.0',
        },
      ]),
    );
  });

  it('rejects submission when a required consent is false', async () => {
    await expect(
      service.submitConsents('user-id', {
        version: 'v1.0.0',
        terms: true,
        privacy: false,
        age: true,
        marketing: false,
        location: false,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockConsentRepository.upsertMany).not.toHaveBeenCalled();
  });

  it('rejects submission when version is blank', async () => {
    await expect(
      service.submitConsents('user-id', {
        version: '   ',
        terms: true,
        privacy: true,
        age: true,
        marketing: false,
        location: false,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockConsentRepository.upsertMany).not.toHaveBeenCalled();
  });

  it('returns hasCompletedRequiredConsents false when the only agreed record for a required type is an outdated version', async () => {
    mockConsentRepository.findAllByUserId.mockResolvedValue([
      {
        ...baseConsentRow('TERMS', 'REQUIRED', true),
        version: 'v1.0.0',
        agreedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        ...baseConsentRow('TERMS', 'REQUIRED', false),
        version: 'v2.0.0',
        agreedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      baseConsentRow('PRIVACY', 'REQUIRED', true),
      baseConsentRow('AGE', 'REQUIRED', true),
    ]);

    await expect(service.getConsentStatus('user-id')).resolves.toEqual(
      expect.objectContaining({ hasCompletedRequiredConsents: false }),
    );
  });

  it('returns hasCompletedRequiredConsents true when the latest version of each required type is agreed, even if an older version was not', async () => {
    mockConsentRepository.findAllByUserId.mockResolvedValue([
      {
        ...baseConsentRow('TERMS', 'REQUIRED', false),
        version: 'v1.0.0',
        agreedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        ...baseConsentRow('TERMS', 'REQUIRED', true),
        version: 'v2.0.0',
        agreedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      baseConsentRow('PRIVACY', 'REQUIRED', true),
      baseConsentRow('AGE', 'REQUIRED', true),
    ]);

    await expect(service.getConsentStatus('user-id')).resolves.toEqual(
      expect.objectContaining({ hasCompletedRequiredConsents: true }),
    );
  });

  it('rejects submission when a consent flag is not a boolean', async () => {
    await expect(
      service.submitConsents('user-id', {
        version: 'v1.0.0',
        terms: true,
        privacy: true,
        age: true,
        marketing: 'yes' as unknown as boolean,
        location: false,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockConsentRepository.upsertMany).not.toHaveBeenCalled();
  });
});
