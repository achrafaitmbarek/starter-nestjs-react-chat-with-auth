import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    private usersService: UsersService,
  ) {}

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
