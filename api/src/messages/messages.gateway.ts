import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

interface ConnectedUser {
  id: string;
  email: string;
  lastConnected: Date;
}

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
})
export class MessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private messagesService: MessagesService) {}

  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('MessagesGateway');
  private connectedUsers = new Map<string, ConnectedUser>();
  private disconnectedUsers = new Map<string, ConnectedUser>();

  afterInit(server: Server) {
    this.logger.log('Messages WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      user.lastConnected = new Date();

      this.disconnectedUsers.set(user.id, user);

      this.connectedUsers.delete(client.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);

    this.emitUserLists();
  }

  @SubscribeMessage('identifyUser')
  handleIdentifyUser(client: Socket, userData: { id: string; email: string }) {
    const connectedUser: ConnectedUser = {
      ...userData,
      lastConnected: new Date(),
    };
    this.connectedUsers.set(client.id, connectedUser);
    this.disconnectedUsers.delete(userData.id);
    this.logger.log(`User identified: ${userData.email}`);
    this.emitUserLists();
    return { success: true };
  }
  @SubscribeMessage('getConnectedUsers')
  handleGetConnectedUsers() {
    return {
      success: true,
      users: Array.from(this.connectedUsers.values()),
      disconnectedUsers: Array.from(this.disconnectedUsers.values()),
    };
  }
  @SubscribeMessage('createMessage')
  async handleCreateMessage(
    client: Socket,
    payload: { text: string; userId: string },
  ) {
    try {
      const createMessageDto = new CreateMessageDto();
      createMessageDto.text = payload.text;

      const message = await this.messagesService.create(
        createMessageDto,
        payload.userId,
      );

      this.server.emit('newMessage', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('likeMessage')
  async handleLikeMessage(client: Socket, payload: { messageId: string }) {
    try {
      const message = await this.messagesService.likeMessage(payload.messageId);
      this.server.emit('messageLiked', {
        messageId: message.id,
        likes: message.likes,
      });
      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error liking message: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
  private emitUserLists() {
    const onlineUsers = Array.from(this.connectedUsers.values()).sort((a, b) =>
      a.email.localeCompare(b.email),
    );

    const offlineUsers = Array.from(this.disconnectedUsers.values()).sort(
      (a, b) => {
        const timeA = new Date(a.lastConnected).getTime();
        const timeB = new Date(b.lastConnected).getTime();
        return timeB - timeA;
      });

    this.server.emit('connectedUsers', {
      online: onlineUsers,
      offline: offlineUsers,
    });
  }

  @SubscribeMessage('findAllMessages')
  async handleFindAllMessages() {
    try {
      const messages = await this.messagesService.findAll();
      return { success: true, messages };
    } catch (error) {
      this.logger.error(`Error finding messages: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
