import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { R2Module } from 'src/r2/r2.module';

@Module({
  providers: [EventService],
  imports : [R2Module],
  controllers : [ EventController],
  exports: [EventService],
})
export class EventModule {}
