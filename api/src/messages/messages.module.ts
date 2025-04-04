import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { UsersModule } from '../users/users.module';
import { MessagesGateway } from './messages.gateway';
import { PrivateMessage } from './entities/private-message.entity';
import { Room } from './entities/room.entity';
import { RoomMessage } from './entities/room-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, PrivateMessage, Room, RoomMessage]),
    UsersModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService],
})
export class MessagesModule {}
