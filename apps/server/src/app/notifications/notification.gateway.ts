import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Optional, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import {
  WsNotificationPayload,
  WsNotificationReadPayload,
  WsScheduleUpdatePayload,
} from '@shiftsync/data-access';
import { TelemetryService } from '../telemetry/telemetry.service';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict to your frontend URL
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // Track connected users to their socket IDs
  private userSockets = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    @Optional() private telemetry?: TelemetryService,
  ) {}

  onModuleInit() {
    this.telemetry?.registerWebSocketConnectionResolver(
      () => this.userSockets.size,
    );
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      this.userSockets.set(payload.sub, client.id);
      this.logger.log(
        `User connected: ${payload.sub} with socket: ${client.id}`,
      );
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`User disconnected: ${userId}`);
        break;
      }
    }
  }

  sendToUser(
    userId: string,
    event: 'notification' | 'notification_read',
    data: WsNotificationPayload | WsNotificationReadPayload,
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
