import {
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject,
  IsOptional,
  IsArray,
  IsString,
  IsNotEmpty,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * 부동소수점 오차 허용 커스텀 데코레이터 (Math.abs(sum - 1.0) < 0.001)
 */
export function IsValidRatioSum(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidRatioSum',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!value || typeof value !== 'object') return false;
          const ratioObj = value as Record<string, unknown>;
          const food = Number(ratioObj.foodRatio ?? 0);
          const exp = Number(ratioObj.experienceRatio ?? 0);
          const trans = Number(ratioObj.transportRatio ?? 0);
          const sum = food + exp + trans;
          return Math.abs(sum - 1.0) < 0.001; // 부동소수점 오차 방어
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property}의 세 비율(foodRatio, experienceRatio, transportRatio)의 합은 1.0(100%)이어야 합니다.`;
        },
      },
    });
  };
}

export class BudgetRatiosDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  foodRatio!: number; // 식비 비율 (예: 0.4)

  @IsNumber()
  @Min(0)
  @Max(1)
  experienceRatio!: number; // 체험/관광비 비율 (예: 0.4)

  @IsNumber()
  @Min(0)
  @Max(1)
  transportRatio!: number; // 교통비 비율 (예: 0.2)
}

export class RecommendRouteRequestDto {
  @IsNumber({}, { message: '예산(budget)은 숫자 형식이어야 합니다.' })
  @Min(10000, { message: '예산(budget)은 최소 10,000원 이상이어야 합니다.' })
  @Max(500000, { message: '예산(budget)은 최대 500,000원 이하이어야 합니다.' })
  budget!: number; // 사용자 입력 총 예산 (원화)

  @IsObject()
  @ValidateNested()
  @Type(() => BudgetRatiosDto)
  @IsValidRatioSum()
  ratios!: BudgetRatiosDto; // 사용자 원하는 비용 분배 비율

  @IsOptional()
  @IsArray({ message: 'themeSlugs는 배열 형식이어야 합니다.' })
  @IsString({ each: true, message: 'themeSlugs의 요소는 문자열이어야 합니다.' })
  @IsNotEmpty({
    each: true,
    message: 'themeSlugs의 요소는 빈 문자열일 수 없습니다.',
  })
  @Transform(({ value }: { value: unknown }): unknown =>
    Array.isArray(value)
      ? (value as unknown[]).map((item: unknown) =>
          typeof item === 'string' ? item.trim() : item,
        )
      : value,
  )
  themeSlugs?: string[]; // 사용자 선택 선호 테마 슬러그 목록 (예: ["local-food", "photo-spot"])
}
