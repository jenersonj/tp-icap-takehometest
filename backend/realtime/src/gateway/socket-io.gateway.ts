import type { Server as HttpServer } from 'node:http';

import {
  AuthEvents,
  isRealtimeGroup,
  SOCKET_IO_PATH,
  SocketClientMessages,
  type RealtimeEventMap,
  type RealtimeEventName,
  type RealtimeGroup,
  type SubscribeAck,
} from '@blotter/contracts';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Server, type Socket } from 'socket.io';

import { TICKET_REDEEMER, type TicketRedeemer } from '../auth/ticket-redeemer.js';
import { REALTIME_CONFIG, type RealtimeConfig } from '../config/realtime.config.js';
import type { RealtimeGateway } from './realtime-gateway.js';

/** Node timers overflow above ~24.8 days; sessions are minutes, but stay safe. */
const MAX_TIMER_MS = 2 ** 31 - 1;

export interface SocketSession {
  userId: string;
  allowedGroups: string[];
  sessionExpiresAt: string;
}

type SessionSocket = Socket;

const sessionOf = (socket: Socket): SocketSession =>
  (socket.data as { session: SocketSession }).session;

/**
 * Socket.IO adapter of the RealtimeGateway, attached to the app's HTTP server.
 *
 * Handshake: the client connects with `auth: { ticket }`; the ticket is redeemed with the
 * service, the socket joins every group it is allowed, and it is told `auth.expired` and
 * disconnected when the session ends. It may also leave and rejoin allowed groups with the
 * `subscribe`/`unsubscribe` messages (acknowledged).
 */
@Injectable()
export class SocketIoRealtimeGateway
  implements RealtimeGateway, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SocketIoRealtimeGateway.name);
  private io?: Server;

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(TICKET_REDEEMER) private readonly redeemer: TicketRedeemer,
    @Inject(REALTIME_CONFIG) private readonly config: Pick<RealtimeConfig, 'CORS_ORIGINS'>,
  ) {}

  onApplicationBootstrap(): void {
    const server = this.httpAdapterHost.httpAdapter?.getHttpServer() as HttpServer | undefined;
    if (server) this.attach(server);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.io?.close();
  }

  attach(server: HttpServer): Server {
    const io = new Server(server, {
      path: SOCKET_IO_PATH,
      cors: { origin: this.config.CORS_ORIGINS, credentials: true },
    });
    io.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        () => next(new Error('unauthorized')),
      );
    });
    io.on('connection', (socket) => this.onConnection(socket));
    this.io = io;
    return io;
  }

  emitToGroup<E extends RealtimeEventName>(
    group: RealtimeGroup,
    event: E,
    data: RealtimeEventMap[E],
  ): void {
    this.server().to(group).emit(event, data);
  }

  emitToClient<E extends RealtimeEventName>(
    socketId: string,
    event: E,
    data: RealtimeEventMap[E],
  ): void {
    this.server().to(socketId).emit(event, data);
  }

  broadcast<E extends RealtimeEventName>(event: E, data: RealtimeEventMap[E]): void {
    this.server().emit(event, data);
  }

  private server(): Server {
    if (!this.io) throw new Error('Socket.IO server is not attached');
    return this.io;
  }

  private async authenticate(socket: SessionSocket): Promise<void> {
    const ticket: unknown = (socket.handshake.auth as Record<string, unknown> | undefined)?.ticket;
    if (typeof ticket !== 'string' || ticket.length === 0 || ticket.length > 512) {
      throw new Error('missing ticket');
    }
    const redeemed = await this.redeemer.redeem(ticket);
    (socket.data as { session: SocketSession }).session = {
      userId: redeemed.userId,
      allowedGroups: redeemed.allowedGroups,
      sessionExpiresAt: redeemed.sessionExpiresAt,
    };
  }

  private onConnection(socket: SessionSocket): void {
    const session = sessionOf(socket);
    for (const group of session.allowedGroups) void socket.join(group);

    const remaining = new Date(session.sessionExpiresAt).getTime() - Date.now();
    const timer = setTimeout(
      () => {
        socket.emit(AuthEvents.EXPIRED, {});
        socket.disconnect(true);
      },
      Math.max(0, Math.min(remaining, MAX_TIMER_MS)),
    );
    socket.on('disconnect', () => clearTimeout(timer));

    const membership =
      (join: boolean) =>
      (message: unknown, ack?: (reply: SubscribeAck) => void): void => {
        const reply = this.changeMembership(socket, message, join);
        if (typeof ack === 'function') ack(reply);
      };
    socket.on(SocketClientMessages.SUBSCRIBE, membership(true));
    socket.on(SocketClientMessages.UNSUBSCRIBE, membership(false));
    this.logger.debug(`Socket ${socket.id} connected for user ${session.userId}`);
  }

  private changeMembership(socket: SessionSocket, message: unknown, join: boolean): SubscribeAck {
    const group = (message as { group?: unknown } | undefined)?.group;
    if (!isRealtimeGroup(group)) return { ok: false, error: 'UNKNOWN_GROUP' };
    if (!sessionOf(socket).allowedGroups.includes(group)) {
      return { ok: false, error: 'FORBIDDEN' };
    }
    if (join) void socket.join(group);
    else void socket.leave(group);
    return { ok: true, group };
  }
}
