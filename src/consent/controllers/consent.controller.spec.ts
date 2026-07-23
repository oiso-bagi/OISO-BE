import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../../auth/auth.constants';
import { AuthCookieService } from '../../auth/services/auth-cookie.service';
import { AuthService } from '../../auth/services/auth.service';
import { ConsentController } from './consent.controller';
import { ConsentService } from '../services/consent.service';

describe('ConsentController', () => {
  let controller: ConsentController;
  const mockConsentService = {
    getConsentStatus: jest.fn(),
    submitConsents: jest.fn(),
  };
  const mockAuthService = {
    getCurrentUser: jest.fn(),
  };
  const mockAuthCookieService = {
    parseCookies: jest.fn(),
    getBearerToken: jest.fn(),
  };

  const mockRequest = { headers: {} } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentController],
      providers: [
        { provide: ConsentService, useValue: mockConsentService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthCookieService, useValue: mockAuthCookieService },
      ],
    }).compile();

    controller = module.get<ConsentController>(ConsentController);
    jest.clearAllMocks();
    mockAuthCookieService.parseCookies.mockReturnValue({
      [ACCESS_TOKEN_COOKIE]: 'cookie-access-token',
    });
    mockAuthCookieService.getBearerToken.mockReturnValue(undefined);
    mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-id' });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('resolves the current user from the access token cookie and delegates status lookup', async () => {
    const payload = { hasCompletedRequiredConsents: true, consents: [] };
    mockConsentService.getConsentStatus.mockResolvedValue(payload);

    await expect(controller.getStatus(mockRequest)).resolves.toEqual(payload);
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(
      'cookie-access-token',
    );
    expect(mockConsentService.getConsentStatus).toHaveBeenCalledWith('user-id');
  });

  it('prefers a bearer token over the access token cookie', async () => {
    mockAuthCookieService.getBearerToken.mockReturnValue('bearer-token');
    mockConsentService.getConsentStatus.mockResolvedValue({
      hasCompletedRequiredConsents: false,
      consents: [],
    });

    await controller.getStatus(mockRequest);

    expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('bearer-token');
  });

  it('delegates consent submission to the service with the authenticated user id', async () => {
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

    await expect(controller.submit(mockRequest, body)).resolves.toEqual(
      payload,
    );
    expect(mockConsentService.submitConsents).toHaveBeenCalledWith(
      'user-id',
      body,
    );
  });
});
