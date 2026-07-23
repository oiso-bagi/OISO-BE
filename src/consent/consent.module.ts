import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsentController } from './controllers/consent.controller';
import { ConsentRepository } from './repositories/consent.repository';
import { ConsentService } from './services/consent.service';

@Module({
  imports: [AuthModule],
  controllers: [ConsentController],
  providers: [ConsentService, ConsentRepository],
})
export class ConsentModule {}
