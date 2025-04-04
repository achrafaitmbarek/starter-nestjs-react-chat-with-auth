/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import { CreatePrivateMessageDto } from './dto/create-private-message.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateRoomMessageDto } from './dto/create-room-message.dto';

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterInit(server: Server) {
    this.logger.log('Messages WebSocket Gateway initialized');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }
      const message = await this.messagesService.likeMessage(
        payload.messageId,
        user.id,
      );
      this.server.emit('messageLiked', {
        messageId: message.id,
        likes: message.likes,
        likedBy: message.likedBy,
      });
      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error liking message: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('unlikeMessage')
  async handleUnlikeMessage(client: Socket, payload: { messageId: string }) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      const message = await this.messagesService.unlikeMessage(
        payload.messageId,
        user.id,
      );

      this.server.emit('messageLiked', {
        messageId: message.id,
        likes: message.likes,
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error unliking message: ${error.message}`);
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
      },
    );

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
  @SubscribeMessage('sendPrivateMessage')
  async handleSendPrivateMessage(
    client: Socket,
    payload: { text: string; recipientId: string },
  ) {
    try {
      const sender = this.connectedUsers.get(client.id);
      if (!sender) {
        throw new Error('User not identified');
      }

      const createPrivateMessageDto = new CreatePrivateMessageDto();
      createPrivateMessageDto.text = payload.text;
      createPrivateMessageDto.recipientId = payload.recipientId;

      const message = await this.messagesService.createPrivateMessage(
        createPrivateMessageDto,
        sender.id,
      );

      // Find the recipient's socket if they're online
      const recipientSocketId = this.findSocketIdByUserId(payload.recipientId);

      // Emit to sender
      client.emit('privateMessage', message);

      // Emit to recipient if online
      if (recipientSocketId) {
        this.server.to(recipientSocketId).emit('privateMessage', message);
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending private message: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getPrivateMessages')
  async handleGetPrivateMessages(
    client: Socket,
    payload: { partnerId: string },
  ) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      const messages = await this.messagesService.getPrivateMessages(
        user.id,
        payload.partnerId,
      );

      return { success: true, messages };
    } catch (error) {
      this.logger.error(`Error getting private messages: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getConversations')
  async handleGetConversations(client: Socket) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      const conversations = await this.messagesService.getConversations(
        user.id,
      );
      return { success: true, conversations };
    } catch (error) {
      this.logger.error(`Error getting conversations: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('markMessagesAsRead')
  async handleMarkMessagesAsRead(
    client: Socket,
    payload: { partnerId: string },
  ) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      await this.messagesService.markMessagesAsRead(user.id, payload.partnerId);

      // Notify sender that messages were read
      const partnerSocketId = this.findSocketIdByUserId(payload.partnerId);
      if (partnerSocketId) {
        this.server.to(partnerSocketId).emit('messagesRead', {
          by: user.id,
          conversation: user.id,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  private findSocketIdByUserId(userId: string): string | undefined {
    for (const [socketId, user] of this.connectedUsers.entries()) {
      if (user.id === userId) {
        return socketId;
      }
    }
    return undefined;
  }
  @SubscribeMessage('createRoom')
  async handleCreateRoom(client: Socket, payload: CreateRoomDto) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      const room = await this.messagesService.createRoom(payload, user.id);

      client.join(`room-${room.id}`);

      this.server.emit('roomList', await this.messagesService.findAllRooms());

      return { success: true, room };
    } catch (error) {
      this.logger.error(`Error creating room: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('getAllRooms')
  async handleGetAllRooms() {
    try {
      const rooms = await this.messagesService.findAllRooms();
      return { success: true, rooms };
    } catch (error) {
      this.logger.error(`Error getting rooms: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: { roomId: string }) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      const room = await this.messagesService.joinRoom(payload.roomId, user.id);

      client.join(`room-${room.id}`);

      this.server.to(`room-${room.id}`).emit('userJoinedRoom', {
        roomId: room.id,
        user: {
          id: user.id,
          email: user.email,
        },
      });

      this.server.emit('roomUpdated', room);

      return { success: true, room };
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(client: Socket, payload: { roomId: string }) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      const room = await this.messagesService.leaveRoom(
        payload.roomId,
        user.id,
      );

      client.leave(`room-${room.id}`);
      const userData = {
        roomId: room.id,
        userId: user.id,
        userEmail: user.email || 'Someone',
      };
      this.server.to(`room-${room.id}`).emit('userLeftRoom', userData);
      this.server.emit('roomUpdated', room);

      return { success: true, room };
    } catch (error) {
      this.logger.error(`Error leaving room: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('sendRoomMessage')
  async handleSendRoomMessage(
    client: Socket,
    payload: { text: string; roomId: string },
  ) {
    try {
      const user = this.connectedUsers.get(client.id);
      if (!user) {
        throw new Error('User not identified');
      }

      const createRoomMessageDto = new CreateRoomMessageDto();
      createRoomMessageDto.text = payload.text;
      createRoomMessageDto.roomId = payload.roomId;

      const message = await this.messagesService.createRoomMessage(
        createRoomMessageDto,
        user.id,
      );
      this.server.to(`room-${payload.roomId}`).emit('roomMessage', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending room message: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
  @SubscribeMessage('getRoomMessages')
  async handleGetRoomMessages(client: Socket, payload: { roomId: string }) {
    try {
      const messages = await this.messagesService.findRoomMessages(
        payload.roomId,
      );
      return { success: true, messages };
    } catch (error) {
      this.logger.error(`Error getting room messages: ${error.message}`);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
}
