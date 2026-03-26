import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

type RealtimeNotificationPayload = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type BillsUpdatedPayload = {
  houseId: string;
  monthKey: string;
  reason: 'expense_created' | 'settlement_updated';
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.APP_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.jwtService.verifyAsync<AuthUser>(token);
      client.data.userId = user.sub;
      await client.join(this.toUserRoom(user.sub));
    } catch (error) {
      this.logger.warn(
        `Socket authentication failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket.io clears joined rooms automatically on disconnect.
  }

  emitNotificationToUsers(userIds: string[], payload: RealtimeNotificationPayload) {
    for (const userId of new Set(userIds)) {
      this.server.to(this.toUserRoom(userId)).emit('notification.created', payload);
    }
  }

  emitBillsUpdatedToUsers(userIds: string[], payload: BillsUpdatedPayload) {
    for (const userId of new Set(userIds)) {
      this.server.to(this.toUserRoom(userId)).emit('bills.updated', payload);
    }
  }

  private toUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string' && authorizationHeader.trim()) {
      return authorizationHeader.replace(/^Bearer\s+/i, '').trim();
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.replace(/^Bearer\s+/i, '').trim();
    }

    return null;
  }
}
