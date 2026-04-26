import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeService } from './trade.service';
import { User } from '../database/user.entity';
import { TradeLog } from '../database/tradelog.entity';
import { AuthService } from '../auth/auth.service';

type ConnectedClientInfo = {
  role: 'MASTER' | 'SLAVE';
  identifier: string;
  subscribedMasterId?: string;
  slaveId?: string | null;
};

@WebSocketGateway({ cors: { origin: '*' } })
export class TradeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private connectedClients = new Map<string, ConnectedClientInfo>();
  private connectedMasters = new Set<string>();

  constructor(
    private readonly tradeService: TradeService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(TradeLog) private tradeLogRepo: Repository<TradeLog>,
  ) {}

  getConnectedMasterIds(): string[] {
    return Array.from(this.connectedMasters);
  }

  isMasterConnected(masterId: string): boolean {
    return this.connectedMasters.has(masterId);
  }

  private log(
    level: 'log' | 'warn' | 'error',
    message: string,
    meta: Record<string, any>,
  ) {
    console[level]('[TradeGateway]', { message, ...meta });
  }

  handleConnection(client: Socket) {
    this.log('log', 'client_connected', {
      clientId: client.id,
      handshakeAddress: client.handshake?.address,
      health_state: 'CONNECTED',
    });
  }

  handleDisconnect(client: Socket) {
    const connectedClient = this.connectedClients.get(client.id);

    if (
      connectedClient?.role === 'MASTER' &&
      connectedClient.subscribedMasterId
    ) {
      this.connectedMasters.delete(connectedClient.subscribedMasterId);
    }

    if (
      connectedClient?.role === 'SLAVE' &&
      connectedClient.subscribedMasterId
    ) {
      const roomName = `room_master_${connectedClient.subscribedMasterId}`;
      this.server.to(roomName).emit('subscriber_update', {
        slaveEmail: connectedClient.identifier,
        online: false,
        timestamp: new Date().toISOString(),
      });
      this.log('log', 'subscriber_update_offline_emitted', {
        clientId: client.id,
        role: connectedClient.role,
        identifier: connectedClient.identifier,
        room: roomName,
      });
    }

    this.connectedClients.delete(client.id);

    this.log('warn', 'client_disconnected', {
      clientId: client.id,
      health_state: 'DISCONNECTED',
    });
  }

  // --- NEW: NODE REGISTRATION FOR ROOM ROUTING ---
  @SubscribeMessage('register_node')
  async handleRegisterNode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { role: string; identifier: string },
  ) {
    const traceId = randomUUID();
    let user;
    if (payload.role === 'MASTER') {
      user = await this.userRepo.findOne({
        where: { licenseKey: payload.identifier, role: 'MASTER' },
      });
      if (user) {
        const roomName = `room_master_${user.id}`;
        client.join(roomName); // Master creates their broadcast room
        client.data.user = user; // Save user context to the socket
        this.connectedClients.set(client.id, {
          role: 'MASTER',
          identifier: payload.identifier,
          subscribedMasterId: user.id,
        });
        this.connectedMasters.add(user.id);
        this.log('log', 'register_node_master_joined', {
          trace_id: traceId,
          role: payload.role,
          identifier: payload.identifier,
          masterId: user.id,
          room: roomName,
        });
        client.emit('node_registered', {
          success: true,
          role: payload.role,
          room: roomName,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (payload.role === 'SLAVE') {
      user = await this.userRepo.findOne({
        where: { email: payload.identifier, role: 'SLAVE' },
      });
      if (user && user.subscribedToId) {
        const subscribedMasterId = user.subscribedToId;
        const roomName = `room_master_${user.subscribedToId}`;
        const slaveId = await this.authService.getSlaveIdByEmail(
          payload.identifier,
        );
        client.join(roomName); // Slave silently joins the Master's room
        this.connectedClients.set(client.id, {
          role: 'SLAVE',
          identifier: payload.identifier,
          subscribedMasterId,
          slaveId,
        });
        this.server.to(roomName).emit('subscriber_update', {
          slaveEmail: payload.identifier,
          online: true,
          timestamp: new Date().toISOString(),
        });
        this.log('log', 'register_node_slave_joined', {
          trace_id: traceId,
          role: payload.role,
          identifier: payload.identifier,
          slaveId: user.id,
          room: roomName,
        });
        this.log('log', 'subscriber_update_online_emitted', {
          trace_id: traceId,
          role: payload.role,
          identifier: payload.identifier,
          slaveId: user.id,
          room: roomName,
        });
        client.emit('node_registered', {
          success: true,
          role: payload.role,
          room: roomName,
          timestamp: new Date().toISOString(),
        });
      } else {
        this.log('warn', 'register_node_slave_no_subscription', {
          trace_id: traceId,
          role: payload.role,
          identifier: payload.identifier,
          slaveId: user?.id,
        });
        client.emit('node_registered', {
          success: false,
          role: payload.role,
          error: 'Room assignment failed',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // --- UPDATED: SIGNAL LOGGING & TARGETED BROADCAST ---
  @SubscribeMessage('test_signal')
  async handleTestSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const traceId = data?.trace_id || randomUUID();
    const masterUser = client.data.user;

    // Security: Ignore unauthorized broadcasts
    if (!masterUser || masterUser.role !== 'MASTER') {
      this.log('warn', 'test_signal_unauthorized_blocked', {
        trace_id: traceId,
        role: masterUser?.role,
      });
      return;
    }

    this.log('log', 'test_signal_received', {
      trace_id: traceId,
      role: masterUser.role,
      masterId: masterUser.id,
      symbol: data?.symbol,
      event: data?.event,
      action: data?.action,
      master_ticket: data?.master_ticket,
      pnl: data?.pnl,
    });

    // 1. Maintain your original TradeService logic (Optional, but kept so we don't break your old code)
    const logData = {
      symbol: data.symbol,
      action: data.event === 'OPEN' ? data.action : 'CLOSE',
      volume: data.volume || 0,
      price: data.price || 0,
    };
    let oldSignalId: number | null = null;
    try {
      oldSignalId = await this.tradeService.logSignal(logData);
    } catch (err) {
      this.log('error', 'legacy_log_signal_failed', {
        trace_id: traceId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 2. NEW: Save to the new TradeLog Table (For Portfolios and PnL Tracking)
    try {
      if (data.event === 'OPEN') {
        const connectedSlaveIds = Array.from(
          this.connectedClients.values(),
        ).filter(
          (connectedClient) =>
            connectedClient.role === 'SLAVE' &&
            connectedClient.subscribedMasterId === masterUser.id &&
            connectedClient.slaveId,
        );
        const newLog = this.tradeLogRepo.create({
          masterId: masterUser.id,
          // TODO: Multiple slaves in the same room need a slave-side execution callback;
          // one master TradeLog row cannot identify every copied slave execution.
          slaveId:
            connectedSlaveIds.length === 1
              ? connectedSlaveIds[0].slaveId
              : null,
          masterName: masterUser.fullName,
          symbol: data.symbol,
          action: data.action,
          volume: data.volume,
          ticketNumber: data.master_ticket.toString(),
          status: 'OPEN',
        });
        await this.tradeLogRepo.save(newLog);
      } else if (data.event === 'CLOSE') {
        // CLOSE flow: locate the still-open trade row for this master/ticket and finalize it.
        // We update three fields in one place so downstream profile/history stats stay accurate:
        // 1) status -> CLOSED
        // 2) pnl -> realized PnL from CLOSE payload
        // 3) closedAt -> server timestamp for closure analytics
        const existingLog = await this.tradeLogRepo.findOne({
          where: {
            masterId: masterUser.id,
            ticketNumber: data.master_ticket.toString(),
            status: 'OPEN',
          },
        });
        if (existingLog) {
          existingLog.status = 'CLOSED';
          existingLog.pnl = data.pnl; // The captured Profit/Loss!
          existingLog.closedAt = new Date();
          await this.tradeLogRepo.save(existingLog);
        } else {
          this.log('warn', 'trade_log_close_target_not_found', {
            trace_id: traceId,
            masterId: masterUser.id,
            master_ticket: data?.master_ticket,
          });
        }
      }
    } catch (dbError) {
      this.log('error', 'trade_log_save_failed', {
        trace_id: traceId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    // 3. NEW: Targeted Broadcast to Room
    const roomName = `room_master_${masterUser.id}`;

    this.server.to(roomName).emit('trade_execution', {
      ...data,
      trace_id: traceId,
      signalId: oldSignalId,
    });

    this.log('log', 'trade_execution_broadcasted', {
      trace_id: traceId,
      room: roomName,
      symbol: data?.symbol,
      event: data?.event,
      master_ticket: data?.master_ticket,
      signalId: oldSignalId,
    });
  }
}
