import { Module } from '@nestjs/common';
import { OrganiserController } from './organiser.controller';
import { OrganiserService } from './organiser.service';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  controllers: [OrganiserController, ActivityController],
  providers: [OrganiserService, ActivityService],
  exports: [OrganiserService],
})
export class OrganiserModule {}
