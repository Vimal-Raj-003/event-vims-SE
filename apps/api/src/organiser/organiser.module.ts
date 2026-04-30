import { Module } from '@nestjs/common';
import { OrganiserController } from './organiser.controller';
import { OrganiserService } from './organiser.service';

@Module({
  controllers: [OrganiserController],
  providers: [OrganiserService],
  exports: [OrganiserService],
})
export class OrganiserModule {}
