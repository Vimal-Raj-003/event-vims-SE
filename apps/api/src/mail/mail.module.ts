import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { AdminModule } from '../admin/admin.module';

@Global()
@Module({
  imports: [AdminModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
