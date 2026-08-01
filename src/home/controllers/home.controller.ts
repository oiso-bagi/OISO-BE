import { Controller, Get, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import {
  ApiGetHomeSummaryDocs,
  ApiHomeControllerDocs,
} from '@/home/docs/home-swagger.docs';
import { HomeSummaryResponseDto } from '@/home/dto/home-summary-response.dto';
import { HomeService } from '@/home/services/home.service';

@ApiHomeControllerDocs()
@Controller('home')
@UseGuards(AuthGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  @ApiGetHomeSummaryDocs()
  getHomeSummary(@CurrentUser() user: User): Promise<HomeSummaryResponseDto> {
    return this.homeService.getHomeSummary(user.id);
  }
}
