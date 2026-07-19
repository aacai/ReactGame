// 四子棋联机房间管理
// - 复用 src/game/mqtt.ts 的连接 / 订阅 / 发布
// - 房间 topic：connect4/${roomCode}
// - 玩家颜色：创建者默认红（1），加入者默认黄（2）
// - 心跳：5s 间隔，10s 超时
// - 消息回调：onMessage 接收对局相关消息（move/resign/undo_*/rematch_*）
//   onOpponentJoin / onOpponentLeave 处理连接状态变化

import {
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  publish,
  MQTTMessage,
} from '../../game/mqtt';
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

// color 为主机（发送方）的颜色，加入者据此取反
export interface JoinAckMessage extends RoomMessageBase {
  type: 'join_ack';
  playerName: string;
  color: Player;
}

export interface LeaveMessage extends RoomMessageBase {
  type: 'leave';
}

// 四子棋落子消息：只需 col + player
export interface MoveMessage extends RoomMessageBase {
  type: 'move';
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

export type RoomMessage =
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

function generatePlayerId(): string {
  return `c4_${Math.random().toString(36).slice(2, 10)}`;
}

function generateRoomCode(): string {
  // 6 位房间号
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTopic(roomCode: string): string {
  return `connect4/${roomCode}`;
}

type MessageCallback = (msg: RoomMessage) => void;

export class Room {
  roomCode: string | null = null;
  myPlayerId: string;
  myColor: Player | null = null;
  myPlayerName: string = '玩家';
  opponentName: string | null = null;
  opponentConnected: boolean = false;
  opponentId: string | null = null;
  isHost: boolean = false;

  // 对局消息回调（move/resign/undo_*/rematch_*），由 store 注册并按 type 分发
  onMessage: MessageCallback | null = null;
  // 连接状态回调
  onOpponentJoin: (() => void) | null = null;
  onOpponentLeave: (() => void) | null = null;

  private lastHeartbeat: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatCheckTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandler: ((msg: MQTTMessage) => void) | null = null;
  private joinAckResolver:
    | ((value: { color: Player; opponentName: string }) => void)
    | null = null;
  private joinAckRejecter: ((reason: Error) => void) | null = null;
  private joinAckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.myPlayerId = generatePlayerId();
  }

  // MQTT 消息分发：协议内部消息（join/join_ack/leave/heartbeat）就地处理
  // 对局消息（move/resign/undo_*/rematch_*）转发给 onMessage
  private handleMessage = (msg: MQTTMessage) => {
    if (!msg || !msg.type || !msg.playerId) return;
    // 忽略自己发出的回声
    if (msg.playerId === this.myPlayerId) return;

    const roomMsg = msg as RoomMessage;

    switch (roomMsg.type) {
      case 'join':
        this.handleJoin(roomMsg as JoinMessage);
        return; // 已通过 onOpponentJoin 通知
      case 'join_ack':
        this.handleJoinAck(roomMsg as JoinAckMessage);
        return; // 已通过 promise + onOpponentJoin 通知
      case 'leave':
        this.handleLeave(roomMsg as LeaveMessage);
        return; // 已通过 onOpponentLeave 通知
      case 'heartbeat':
        this.handleHeartbeat(roomMsg as HeartbeatMessage);
        return; // 内部 keepalive，不转发
      default:
        // 其他消息仅当来自当前对手时才转发，避免陌生人干扰
        if (roomMsg.playerId !== this.opponentId) return;
        if (this.onMessage) this.onMessage(roomMsg);
        return;
    }
  };

  // 主机收到加入请求：记录对手信息，回 join_ack，触发 onOpponentJoin
  private handleJoin(msg: JoinMessage) {
    if (!this.isHost) return;
    if (this.opponentConnected) return; // 已有对手，拒绝二次加入

    this.opponentId = msg.playerId;
    this.opponentName = msg.playerName;
    this.opponentConnected = true;
    this.lastHeartbeat = Date.now();
    this.myColor = 1; // 主机默认红
    this.sendJoinAck();
    if (this.onOpponentJoin) this.onOpponentJoin();
  }

  // 加入者收到主机应答：解析颜色，触发 onOpponentJoin
  private handleJoinAck(msg: JoinAckMessage) {
    if (!this.joinAckResolver) return;

    this.opponentId = msg.playerId;
    this.opponentName = msg.playerName;
    this.opponentConnected = true;
    this.lastHeartbeat = Date.now();
    // 加入者颜色与主机相反
    this.myColor = msg.color === 1 ? 2 : 1;

    this.joinAckResolver({
      color: this.myColor,
      opponentName: msg.playerName,
    });
    this.joinAckResolver = null;
    this.joinAckRejecter = null;
    if (this.joinAckTimer) {
      clearTimeout(this.joinAckTimer);
      this.joinAckTimer = null;
    }
    if (this.onOpponentJoin) this.onOpponentJoin();
  }

  private handleLeave(msg: LeaveMessage) {
    if (msg.playerId !== this.opponentId) return;
    this.opponentConnected = false;
    this.opponentId = null;
    this.opponentName = null;
    if (this.onOpponentLeave) this.onOpponentLeave();
  }

  private handleHeartbeat(msg: HeartbeatMessage) {
    if (msg.playerId !== this.opponentId) return;
    this.lastHeartbeat = Date.now();
    // 若此前被判定掉线，心跳恢复时重新触发加入事件
    if (!this.opponentConnected) {
      this.opponentConnected = true;
      if (this.onOpponentJoin) this.onOpponentJoin();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.roomCode) this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL);

    this.heartbeatCheckTimer = setInterval(() => {
      if (this.opponentId && this.opponentConnected) {
        if (Date.now() - this.lastHeartbeat > HEARTBEAT_TIMEOUT) {
          this.opponentConnected = false;
          if (this.onOpponentLeave) this.onOpponentLeave();
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

  // 创建房间：返回 6 位房间号；创建者默认红（1）
  async createRoom(playerName?: string): Promise<string> {
    if (playerName) this.myPlayerName = playerName;

    const code = generateRoomCode();
    await connect(this.myPlayerId);

    this.roomCode = code;
    this.isHost = true;
    this.myColor = 1;
    this.opponentConnected = false;
    this.opponentId = null;
    this.opponentName = null;

    const topic = getTopic(code);
    this.messageHandler = this.handleMessage;
    subscribe(topic, this.messageHandler);

    this.startHeartbeat();
    return code;
  }

  // 加入房间：返回 { color, opponentName }；3s 未收到 join_ack 视为房间不存在
  async joinRoom(
    roomCode: string,
    playerName?: string
  ): Promise<{ color: Player; opponentName: string }> {
    if (playerName) this.myPlayerName = playerName;

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

  leaveRoom(): void {
    if (this.roomCode) this.sendLeave();
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

  // 发送落子：col + 自动填充的 player（= myColor）
  sendMove(col: number): void {
    if (!this.roomCode || this.myColor === null) return;
    const msg: MoveMessage = {
      type: 'move',
      playerId: this.myPlayerId,
      col,
      player: this.myColor,
    };
    publish(getTopic(this.roomCode), msg);
  }

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

  sendUndoRequest(): void {
    if (!this.roomCode) return;
    const msg: UndoRequestMessage = {
      type: 'undo_request',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  sendUndoAccept(): void {
    if (!this.roomCode) return;
    const msg: UndoAcceptMessage = {
      type: 'undo_accept',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  sendUndoReject(): void {
    if (!this.roomCode) return;
    const msg: UndoRejectMessage = {
      type: 'undo_reject',
      playerId: this.myPlayerId,
    };
    publish(getTopic(this.roomCode), msg);
  }

  // 主机应答加入者：附带自己的颜色，加入者据此取反
  private sendJoinAck(): void {
    if (!this.roomCode || this.myColor === null) return;
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

// 全局单例：与 mqtt.ts 的单 client 模型配合
export const room = new Room();
