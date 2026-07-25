import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/common/guards/auth.guard';

/**
 * AuthGuard가 요청에 붙여둔 인증된 유저를 꺼내는 파라미터 데코레이터입니다.
 * AuthGuard 없이 단독으로 사용하면 undefined가 반환되니 반드시 @UseGuards(AuthGuard)와 함께 씁니다.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
