import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { 
  WsNotificationPayload, 
  WsNotificationReadPayload, 
  WsScheduleUpdatePayload 
} from '@shiftsync/data-access';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict to your frontend URL
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users to their socket IDs
  private userSockets = new Map<string, string>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.userSockets.set(payload.userId, client.id);
      console.log(`User connected: ${payload.userId} with socket: ${client.id}`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  }

  sendToUser(
    userId: string, 
    event: 'notification' | 'notification_read', 
    data: WsNotificationPayload | WsNotificationReadPayload
  ) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  broadcast(event: 'schedule_update', data: WsScheduleUpdatePayload) {
    this.server.emit(event, data);
  }
}
