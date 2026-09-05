import { SaveRouteResponseDto } from '@/route/dto/save-route-response.dto';

describe('SaveRouteResponseDto', () => {
  it('creates DTO with created = true when new route is saved', () => {
    const dto = SaveRouteResponseDto.from(true);
    expect(dto).toBeInstanceOf(SaveRouteResponseDto);
    expect(dto.created).toBe(true);
  });

  it('creates DTO with created = false when route is already saved', () => {
    const dto = SaveRouteResponseDto.from(false);
    expect(dto).toBeInstanceOf(SaveRouteResponseDto);
    expect(dto.created).toBe(false);
  });
});
