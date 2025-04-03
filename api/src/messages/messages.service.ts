import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UsersService } from '../users/users.service';
import { PrivateMessage } from './entities/private-message.entity';
import { CreatePrivateMessageDto } from './dto/create-private-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(PrivateMessage)
    private privateMessagesRepository: Repository<PrivateMessage>,
    private usersService: UsersService,
  ) {}

  async createPrivateMessage(
    createPrivateMessageDto: CreatePrivateMessageDto,
    senderId: string,
  ): Promise<PrivateMessage> {
    const sender = await this.usersService.findOne(senderId);
    const recipient = await this.usersService.findOne(
      createPrivateMessageDto.recipientId,
    );
    const message = this.privateMessagesRepository.create({
      text: createPrivateMessageDto.text,
      sender,
      recipient,
    });
    return this.privateMessagesRepository.save(message);
  }
  async getPrivateMessages(
    userId1: string,
    userId2: string,
  ): Promise<PrivateMessage[]> {
    return this.privateMessagesRepository.find({
      where: [
        { sender: { id: userId1 }, recipient: { id: userId2 } },
        { sender: { id: userId2 }, recipient: { id: userId1 } },
      ],
      order: { createdAt: 'ASC' },
    });
  }
  async getConversations(userId: string): Promise<any[]> {
    // Get all private messages where the user is either sender or recipient
    const messages = await this.privateMessagesRepository.find({
      where: [{ sender: { id: userId } }, { recipient: { id: userId } }],
      order: { createdAt: 'DESC' },
      relations: ['sender', 'recipient'],
    });
    const conversations = new Map();
    messages.forEach((message) => {
      const partnerId =
        message.sender.id === userId ? message.recipient.id : message.sender.id;
      const partner =
        message.sender.id === userId ? message.recipient : message.sender;
      if (
        !conversations.has(partnerId) ||
        new Date(message.createdAt) >
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          new Date(conversations.get(partnerId).lastMessage.createdAt)
      ) {
        conversations.set(partnerId, {
          partner,
          lastMessage: message,
          unread: message.recipient.id === userId && !message.read ? 1 : 0,
        });
      } else if (message.recipient.id === userId && !message.read) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const convo = conversations.get(partnerId);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        convo.unread = (convo.unread || 0) + 1;
        conversations.set(partnerId, convo);
      }
    });
    return Array.from(conversations.values());
  }
  async markMessagesAsRead(userId: string, partnerId: string): Promise<void> {
    await this.privateMessagesRepository.update(
      {
        recipient: { id: userId },
        sender: { id: partnerId },
        read: false,
      },
      { read: true },
    );
  }
  async create(
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    console.log('createMessageDto : ', createMessageDto);
    const user = await this.usersService.findOne(userId);
    const message = this.messagesRepository.create({
      ...createMessageDto,
      user,
    });
    return this.messagesRepository.save(message);
  }

  findAll(): Promise<Message[]> {
    return this.messagesRepository.find({
      relations: ['user', 'likedBy'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: ['user', 'likedBy'],
    });
    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }
    return message;
  }

  async update(
    id: string,
    updateMessageDto: CreateMessageDto,
  ): Promise<Message> {
    await this.messagesRepository.update(id, updateMessageDto);
    return this.findOne(id);
  }
  async likeMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.findOne(messageId);
    const user = await this.usersService.findOne(userId);

    const hasLiked = await this.messagesRepository
      .createQueryBuilder('message')
      .innerJoin('message.likedBy', 'user')
      .where('message.id = :messageId', { messageId })
      .andWhere('user.id = :userId', { userId })
      .getCount();
    if (hasLiked > 0) {
      return message;
    }
    message.likes += 1;
    message.likedBy = [...(message.likedBy || []), user];
    return this.messagesRepository.save(message);
  }
  async unlikeMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.findOne(messageId);
    console.log('message : ', message);
    const hasLiked = await this.messagesRepository
      .createQueryBuilder('message')
      .innerJoin('message.likedBy', 'user')
      .where('message.id = :messageId', { messageId })
      .andWhere('user.id = :userId', { userId })
      .getCount();
    if (hasLiked === 0) {
      return message;
    }

    message.likes = Math.max(0, message.likes - 1);
    message.likedBy = message.likedBy.filter(
      (likedUser) => likedUser.id !== userId,
    );
    return this.messagesRepository.save(message);
  }
  async remove(id: string): Promise<void> {
    await this.messagesRepository.softDelete(id);
  }
}
