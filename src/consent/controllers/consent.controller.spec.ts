import { Test, TestingModule } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { AuthGuard } from '@/common/guards/auth.guard';
import { ConsentController } from '@/consent/controllers/consent.controller';
import { ConsentService } from '@/consent/services/consent.service';

describe('ConsentController', () => {
  let controller: ConsentController;
  const mockConsentService = {
    getConsentStatus: jest.fn(),
    submitConsents: jest.fn(),
  };
  const mockUser = { id: 'user-id' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentController],
      providers: [{ provide: ConsentService, useValue: mockConsentService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ConsentController>(ConsentController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates status lookup to the service with the current user id', async () => {
    const payload = { hasCompletedRequiredConsents: true, consents: [] };
    mockConsentService.getConsentStatus.mockResolvedValue(payload);

    await expect(controller.getStatus(mockUser)).resolves.toEqual(payload);
    expect(mockConsentService.getConsentStatus).toHaveBeenCalledWith('user-id');
  });

  it('delegates consent submission to the service with the current user id', async () => {
    const body = {
      version: 'v1.0.0',
      terms: true,
      privacy: true,
      age: true,
      marketing: false,
      location: false,
    };
    const payload = { hasCompletedRequiredConsents: true, consents: [] };
    mockConsentService.submitConsents.mockResolvedValue(payload);

    await expect(controller.submit(mockUser, body)).resolves.toEqual(payload);
    expect(mockConsentService.submitConsents).toHaveBeenCalledWith(
      'user-id',
      body,
    );
  });
});
