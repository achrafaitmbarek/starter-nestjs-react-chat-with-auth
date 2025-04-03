import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message } from './entities/message.entity';
import { UsersModule } from '../users/users.module';
import { MessagesGateway } from './messages.gateway';
import { PrivateMessage } from './entities/private-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, PrivateMessage]), UsersModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway],
  exports: [MessagesService],
})
export class MessagesModule {}
