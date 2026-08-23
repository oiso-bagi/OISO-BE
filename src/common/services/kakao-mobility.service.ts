import { Injectable, Logger } from '@nestjs/common';

export interface PathCoordinate {
  latitude: number;
  longitude: number;
}

@Injectable()
export class KakaoMobilityService {
  private readonly logger = new Logger(KakaoMobilityService.name);
  private readonly apiKey = process.env.KAKAO_REST_API_KEY;

  /**
   * 시작점(origin)부터 도착점(destination) 및 경유지점(waypoints)을 거치는 실제 도로 경로 좌표(pathCoordinates)를 조회합니다.
   * API 키가 없거나 네트워크 오류 발생 시 두 지점 간 보간 직간접 좌표(Haversine Fallback)를 자동 생성하여 안정성을 보장합니다.
   */
  async fetchPathCoordinates(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    waypoints: Array<{ latitude: number; longitude: number }> = [],
  ): Promise<PathCoordinate[]> {
    if (!this.apiKey) {
      this.logger.warn(
        'KAKAO_REST_API_KEY가 설정되어 있지 않아 직선 보간 Fallback 좌표를 생성합니다.',
      );
      return this.generateFallbackPath(origin, destination, waypoints);
    }

    try {
      const originStr = `${origin.longitude},${origin.latitude}`;
      const destinationStr = `${destination.longitude},${destination.latitude}`;
      const waypointsStr = waypoints
        .map((w) => `${w.longitude},${w.latitude}`)
        .join('|');

      const url = new URL('https://apis-navi.kakaomobility.com/v1/directions');
      url.searchParams.append('origin', originStr);
      url.searchParams.append('destination', destinationStr);
      if (waypointsStr.length > 0) {
        url.searchParams.append('waypoints', waypointsStr);
      }
      url.searchParams.append('priority', 'RECOMMEND');
      url.searchParams.append('car_type', '1');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `KakaoAK ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `카카오모빌리티 API 응답 실패 (Status: ${response.status}). Fallback 좌표를 생성합니다.`,
        );
        return this.generateFallbackPath(origin, destination, waypoints);
      }

      const data = (await response.json()) as {
        routes?: Array<{
          result_code?: number;
          sections?: Array<{
            roads?: Array<{
              vertexes?: number[];
            }>;
          }>;
        }>;
      };

      const routeData = data.routes?.[0];
      if (!routeData || routeData.result_code !== 0) {
        this.logger.warn(
          `카카오모빌리티 API 결과 코드 이상 (result_code: ${routeData?.result_code}). Fallback 좌표를 생성합니다.`,
        );
        return this.generateFallbackPath(origin, destination, waypoints);
      }

      const coordinates: PathCoordinate[] = [];
      const sections = routeData.sections || [];

      for (const section of sections) {
        const roads = section.roads || [];
        for (const road of roads) {
          const vertexes = road.vertexes || [];
          for (let i = 0; i < vertexes.length; i += 2) {
            const lng = vertexes[i];
            const lat = vertexes[i + 1];
            if (typeof lng === 'number' && typeof lat === 'number') {
              // 중복 연달아 나오는 좌표 제거
              const prev = coordinates[coordinates.length - 1];
              if (
                !prev ||
                Math.abs(prev.latitude - lat) > 1e-6 ||
                Math.abs(prev.longitude - lng) > 1e-6
              ) {
                coordinates.push({ latitude: lat, longitude: lng });
              }
            }
          }
        }
      }

      if (coordinates.length === 0) {
        return this.generateFallbackPath(origin, destination, waypoints);
      }

      return coordinates;
    } catch (error) {
      this.logger.error(
        '카카오모빌리티 길찾기 API 호출 중 예외 발생. Fallback 좌표로 대체합니다.',
        error,
      );
      return this.generateFallbackPath(origin, destination, waypoints);
    }
  }

  /**
   * 두 지점 간 (또는 경유 지점 포함) 직선 보간 Fallback 좌표점들을 생성합니다.
   */
  generateFallbackPath(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    waypoints: Array<{ latitude: number; longitude: number }> = [],
  ): PathCoordinate[] {
    const points = [origin, ...waypoints, destination];
    const path: PathCoordinate[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const steps = 5;

      for (let s = 0; s <= steps; s++) {
        if (i > 0 && s === 0) continue; // 중복 지점 방지
        const t = s / steps;
        const lat = Number(
          (p1.latitude + (p2.latitude - p1.latitude) * t).toFixed(6),
        );
        const lng = Number(
          (p1.longitude + (p2.longitude - p1.longitude) * t).toFixed(6),
        );
        path.push({ latitude: lat, longitude: lng });
      }
    }

    return path;
  }
}
