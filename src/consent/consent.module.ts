import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { ConsentController } from '@/consent/controllers/consent.controller';
import { ConsentRepository } from '@/consent/repositories/consent.repository';
import { ConsentService } from '@/consent/services/consent.service';

@Module({
  imports: [AuthModule],
  controllers: [ConsentController],
  providers: [ConsentService, ConsentRepository],
})
export class ConsentModule {}
