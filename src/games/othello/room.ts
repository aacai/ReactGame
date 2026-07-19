// 黑白棋联机房间管理
// 复用 src/game/mqtt.ts 的 MQTT 连接，消息适配黑白棋（落子只需 row/col/player）
// - 房间 topic：othello/${roomCode}
// - 玩家颜色：创建者黑（1），加入者白（2）
// - 心跳：5s 间隔，10s 超时

import { connect, disconnect, subscribe, unsubscribe, publish } from '../../game/mqtt';
import type { Player } from './rules';

export type RoomMessageType =
  | 'join'
  | 'join_ack'
  | 'leave'
  | 'move'
  | 'resign'
  | 'rematch_request'
  | 'rematch_accept'
  | 'undo_request'
  | 'undo_accept'
  | 'undo_reject'
  | 'heartbeat';

export interface RoomMessageBase {
  type: RoomMessageType;
  playerId: string;
}

export interface JoinMessage extends RoomMessageBase {
  type: 'join';
  playerName: string;
}

export interface JoinAckMessage extends RoomMessageBase {
  type: 'join_ack';
  playerName: string;
  color: Player; // 发送方（host）的颜色
}

export interface LeaveMessage extends RoomMessageBase {
  type: 'leave';
}

export interface MoveMessage extends RoomMessageBase {
  type: 'move';
  row: number;
  col: number;
  player: Player;
}

export interface ResignMessage extends RoomMessageBase {
  type: 'resign';
}

export interface RematchRequestMessage extends RoomMessageBase {
  type: 'rematch_request';
}

export interface RematchAcceptMessage extends RoomMessageBase {
  type: 'rematch_accept';
}

export interface UndoRequestMessage extends RoomMessageBase {
  type: 'undo_request';
}

export interface UndoAcceptMessage extends RoomMessageBase {
  type: 'undo_accept';
}

export interface UndoRejectMessage extends RoomMessageBase {
  type: 'undo_reject';
}

export interface HeartbeatMessage extends RoomMessageBase {
  type: 'heartbeat';
  timestamp: number;
}

export type OthelloRoomMessage =
  | JoinMessage
  | JoinAckMessage
  | LeaveMessage
  | MoveMessage
  | ResignMessage
  | RematchRequestMessage
  | RematchAcceptMessage
  | UndoRequestMessage
  | UndoAcceptMessage
  | UndoRejectMessage
  | HeartbeatMessage;

const HEARTBEAT_INTERVAL = 5000;
const HEARTBEAT_TIMEOUT = 10000;
const JOIN_ACK_TIMEOUT = 3000;

// 房间 topic 前缀
function getTopic(roomCode: string): string {
  return `othello/${roomCode}`;
}

function generatePlayerId(): string {
  return `othello_${Math.random().toString(36).slice(2, 10)}`;
}

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class OthelloRoom {
  roomCode: string | null = null;
  myPlayerId: string;
  myColor: Player | null = null;       // 1=黑（创建者），2=白（加入者）
  myPlayerName: string = '玩家';
  opponentName: string | null = null;
  opponentId: string | null = null;
  opponentConnected: boolean = false;
  isHost: boolean = false;

  // 单一消息回调：上层自行按 type 分发
  private messageCallback: ((msg: OthelloRoomMessage) => void) | null = null;
  private messageHandler: ((msg: OthelloRoomMessage) => void) | null = null;

  private lastHeartbeat: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatCheckTimer: ReturnType<typeof setInterval> | null = null;

  // join_ack 应答机制（加入方等待 host 回应）
  private joinAckResolver: (() => void) | null = null;
  private joinAckRejecter: ((err: Error) => void) | null = null;
  private joinAckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.myPlayerId = generatePlayerId();
  }

  // 注册消息回调
  onMessage(callback: (msg: OthelloRoomMessage) => void): void {
    this.messageCallback = callback;
  }

  // 内部分发：过滤自己发的消息，转发给上层
  private handleMessage = (msg: OthelloRoomMessage) => {
    if (!msg || !msg.type || !msg.playerId) return;
    if (msg.playerId === this.myPlayerId) return;

    // join_ack 特殊处理：解析 joinRoom 的 Promise
    if (msg.type === 'join_ack') {
      this.handleJoinAck(msg as JoinAckMessage);
      return;
    }

    // 收到对方任何消息都更新心跳时间
    this.lastHeartbeat = Date.now();
    if (!this.opponentConnected) {
      this.opponentConnected = true;
    }
    if (msg.type === 'join') {
      this.handleJoin(msg as JoinMessage);
    }

    if (this.messageCallback) {
      this.messageCallback(msg);
    }
  };

  // host 收到 join：记录对手信息，回发 join_ack
  private handleJoin(msg: JoinMessage) {
    if (!this.isHost) return;
    if (this.opponentConnected && this.opponentId !== msg.playerId) return;

    this.opponentId = msg.playerId;
    this.opponentName = msg.playerName;
    this.myColor = 1; // 创建者执黑
    this.opponentConnected = true;
    this.lastHeartbeat = Date.now();

    // 回发 join_ack，告知 host 颜色（黑），加入方据此推出自己执白
    this.sendJoinAck();
  }

  // 加入方收到 join_ack：解析 Promise，确定自己颜色
  private handleJoinAck(msg: JoinAckMessage) {
    this.opponentId = msg.playerId;
    this.opponentName = msg.playerName;
    this.opponentConnected = true;
    this.lastHeartbeat = Date.now();
    // host 颜色为黑（1），加入方为白（2）
    this.myColor = msg.color === 1 ? 2 : 1;

    if (this.joinAckResolver) {
      const resolve = this.joinAckResolver;
      this.joinAckResolver = null;
      this.joinAckRejecter = null;
      if (this.joinAckTimer) {
        clearTimeout(this.joinAckTimer);
        this.joinAckTimer = null;
      }
      resolve();
    }

    if (this.messageCallback) {
      this.messageCallback(msg);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.roomCode) {
        this.sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatCheckTimer = setInterval(() => {
      if (this.opponentId && this.opponentConnected) {
        const now = Date.now();
        if (now - this.lastHeartbeat > HEARTBEAT_TIMEOUT) {
          this.opponentConnected = false;
          // 通知上层对手掉线
          if (this.messageCallback && this.roomCode) {
            this.messageCallback({ type: 'leave', playerId: this.opponentId });
          }
          this.opponentId = null;
          this.opponentName = null;
        }
      }
    }, 2000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatCheckTimer) {
      clearInterval(this.heartbeatCheckTimer);
      this.heartbeatCheckTimer = null;
    }
  }

  // 创建房间：创建者默认执黑（1）
  async createRoom(playerName: string): Promise<string> {
    this.myPlayerName = playerName;
    const roomCode = generateRoomCode();
    await connect(this.myPlayerId);

    this.roomCode = roomCode;
    this.isHost = true;
    this.myColor = 1;
    this.opponentConnected = false;
    this.opponentId = null;
    this.opponentName = null;

    const topic = getTopic(roomCode);
    this.messageHandler = this.handleMessage;
    subscribe(topic, this.messageHandler);

    this.startHeartbeat();

    return roomCode;
  }

  // 加入房间：加入者默认执白（2），等待 host 回 join_ack
  async joinRoom(roomCode: string, playerName: string): Promise<void> {
    this.myPlayerName = playerName;
    await connect(this.myPlayerId);

    this.roomCode = roomCode;
    this.isHost = false;
    this.myColor = null;
    this.opponentConnected = false;
    this.opponentId = null;
    this.opponentName = null;

    const topic = getTopic(roomCode);
    this.messageHandler = this.handleMessage;
    subscribe(topic, this.messageHandler);

    this.startHeartbeat();

    return new Promise((resolve, reject) => {
      this.joinAckResolver = resolve;
      this.joinAckRejecter = reject;

      this.joinAckTimer = setTimeout(() => {
        this.joinAckResolver = null;
        this.joinAckRejecter = null;
        this.joinAckTimer = null;
        this.cleanup();
        reject(new Error('房间不存在或已解散'));
      }, JOIN_ACK_TIMEOUT);

      this.sendJoin();
    });
  }

  // 离开房间：发送 leave 消息并清理本地状态
  leaveRoom(): void {
    if (this.roomCode) {
      this.sendLeave();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stopHeartbeat();

    if (this.roomCode && this.messageHandler) {
      unsubscribe(getTopic(this.roomCode));
      this.messageHandler = null;
    }

    disconnect();

    this.roomCode = null;
    this.myColor = null;
    this.isHost = false;
    this.opponentConnected = false;
    this.opponentId = null;
    this.opponentName = null;
    this.joinAckResolver = null;
    this.joinAckRejecter = null;

    if (this.joinAckTimer) {
      clearTimeout(this.joinAckTimer);
      this.joinAckTimer = null;
    }
  }

  // 发送落子消息
  sendMove(row: number, col: number): void {
    if (!this.roomCode || !this.myColor) return;
    const msg: MoveMessage = {
      type: 'move',
      playerId: this.myPlayerId,
      row,
      col,
      player: this.myColor,
    };
    publish(getTopic(this.roomCode), msg);
  }

  // 认输
  sendResign(): void {
    if (!this.roomCode) return;
    const msg: ResignMessage = {
      type: 'resign',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  sendRematchRequest(): void {
    if (!this.roomCode) return;
    const msg: RematchRequestMessage = {
      type: 'rematch_request',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  sendRematchAccept(): void {
    if (!this.roomCode) return;
    const msg: RematchAcceptMessage = {
      type: 'rematch_accept',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  // 请求悔棋
  sendUndoRequest(): void {
    if (!this.roomCode) return;
    const msg: UndoRequestMessage = {
      type: 'undo_request',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  // 同意悔棋
  sendUndoAccept(): void {
    if (!this.roomCode) return;
    const msg: UndoAcceptMessage = {
      type: 'undo_accept',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  // 拒绝悔棋
  sendUndoReject(): void {
    if (!this.roomCode) return;
    const msg: UndoRejectMessage = {
      type: 'undo_reject',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  // host 回发 join_ack
  private sendJoinAck(): void {
    if (!this.roomCode || !this.myColor) return;
    const msg: JoinAckMessage = {
      type: 'join_ack',
      playerId: this.myPlayerId,
      playerName: this.myPlayerName,
      color: this.myColor,
    };
    publish(getTopic(this.roomCode), msg);
  }

  private sendJoin(): void {
    if (!this.roomCode) return;
    const msg: JoinMessage = {
      type: 'join',
      playerId: this.myPlayerId,
      playerName: this.myPlayerName,
    };
    publish(getTopic(this.roomCode), msg);
  }

  private sendLeave(): void {
    if (!this.roomCode) return;
    const msg: LeaveMessage = {
      type: 'leave',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  private sendHeartbeat(): void {
    if (!this.roomCode) return;
    const msg: HeartbeatMessage = {
      type: 'heartbeat',
      playerId: this.myPlayerId,
      timestamp: Date.now(),
    };
    publish(getTopic(this.roomCode), msg);
  }
}

// 全局单例
export const othelloRoom = new OthelloRoom();
