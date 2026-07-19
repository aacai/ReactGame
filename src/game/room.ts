import { connect, disconnect, subscribe, unsubscribe, publish } from './mqtt';
import type { PieceColor, Piece } from './types';

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
  color?: PieceColor;
}

export interface JoinAckMessage extends RoomMessageBase {
  type: 'join_ack';
  playerName: string;
  color: PieceColor;
  boardState?: Piece[];
  currentPlayer?: PieceColor;
}

export interface LeaveMessage extends RoomMessageBase {
  type: 'leave';
}

export interface MoveMessage extends RoomMessageBase {
  type: 'move';
  from: { col: number; row: number };
  to: { col: number; row: number };
  pieceId: string;
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

export interface MoveData {
  from: { col: number; row: number };
  to: { col: number; row: number };
  pieceId: string;
}

const HEARTBEAT_INTERVAL = 5000;
const HEARTBEAT_TIMEOUT = 10000;
const JOIN_ACK_TIMEOUT = 3000;

function generatePlayerId(): string {
  return `player_${Math.random().toString(36).slice(2, 10)}`;
}

function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTopic(roomId: string): string {
  return `xiangqi/${roomId}`;
}

export class RoomManager {
  roomId: string | null = null;
  myPlayerId: string;
  myColor: PieceColor | null = null;
  myPlayerName: string = '玩家';
  opponentName: string | null = null;
  opponentConnected: boolean = false;
  isHost: boolean = false;

  onOpponentJoin: (() => void) | null = null;
  onOpponentLeave: (() => void) | null = null;
  onMove: ((move: MoveData) => void) | null = null;
  onResign: (() => void) | null = null;
  onRematchRequest: (() => void) | null = null;
  onRematchAccept: (() => void) | null = null;
  onUndoRequest: (() => void) | null = null;
  onUndoAccept: (() => void) | null = null;
  onUndoReject: (() => void) | null = null;

  opponentId: string | null = null;
  private lastHeartbeat: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatCheckTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandler: ((msg: any) => void) | null = null;
  private joinAckResolver: ((value: { color: PieceColor; boardState?: Piece[]; currentPlayer?: PieceColor }) => void) | null = null;
  private joinAckRejecter: ((reason: Error) => void) | null = null;
  private joinAckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.myPlayerId = generatePlayerId();
  }

  private handleMessage = (msg: any) => {
    if (!msg || !msg.type || !msg.playerId) return;
    if (msg.playerId === this.myPlayerId) return;

    switch (msg.type) {
      case 'join':
        this.handleJoin(msg as JoinMessage);
        break;
      case 'join_ack':
        this.handleJoinAck(msg as JoinAckMessage);
        break;
      case 'leave':
        this.handleLeave(msg as LeaveMessage);
        break;
      case 'move':
        this.handleMove(msg as MoveMessage);
        break;
      case 'resign':
        this.handleResign(msg as ResignMessage);
        break;
      case 'rematch_request':
        this.handleRematchRequest(msg as RematchRequestMessage);
        break;
      case 'rematch_accept':
        this.handleRematchAccept(msg as RematchAcceptMessage);
        break;
      case 'undo_request':
        this.handleUndoRequest(msg as UndoRequestMessage);
        break;
      case 'undo_accept':
        this.handleUndoAccept(msg as UndoAcceptMessage);
        break;
      case 'undo_reject':
        this.handleUndoReject(msg as UndoRejectMessage);
        break;
      case 'heartbeat':
        this.handleHeartbeat(msg as HeartbeatMessage);
        break;
    }
  };

  private handleJoin(msg: JoinMessage) {
    if (!this.isHost) return;
    if (this.opponentConnected) return;

    this.opponentId = msg.playerId;
    this.opponentName = msg.playerName;
    this.myColor = 'red';
    this.opponentConnected = true;
    this.lastHeartbeat = Date.now();

    if (this.onOpponentJoin) {
      this.onOpponentJoin();
    }
  }

  private handleJoinAck(msg: JoinAckMessage) {
    if (this.joinAckResolver) {
      this.opponentId = msg.playerId;
      this.opponentName = msg.playerName;
      this.opponentConnected = true;
      this.lastHeartbeat = Date.now();
      this.myColor = msg.color === 'red' ? 'black' : 'red';
      this.joinAckResolver({
        color: this.myColor,
        boardState: msg.boardState,
        currentPlayer: msg.currentPlayer,
      });
      this.joinAckResolver = null;
      this.joinAckRejecter = null;
      if (this.joinAckTimer) {
        clearTimeout(this.joinAckTimer);
        this.joinAckTimer = null;
      }
      if (this.onOpponentJoin) {
        this.onOpponentJoin();
      }
    }
  }

  private handleLeave(msg: LeaveMessage) {
    if (msg.playerId === this.opponentId) {
      this.opponentConnected = false;
      this.opponentId = null;
      this.opponentName = null;
      if (this.onOpponentLeave) {
        this.onOpponentLeave();
      }
    }
  }

  private handleMove(msg: MoveMessage) {
    if (msg.playerId !== this.opponentId) return;
    if (this.onMove) {
      this.onMove({
        from: msg.from,
        to: msg.to,
        pieceId: msg.pieceId,
      });
    }
  }

  private handleResign(msg: ResignMessage) {
    if (msg.playerId !== this.opponentId) return;
    if (this.onResign) {
      this.onResign();
    }
  }

  private handleRematchRequest(msg: RematchRequestMessage) {
    if (msg.playerId !== this.opponentId) return;
    if (this.onRematchRequest) {
      this.onRematchRequest();
    }
  }

  private handleRematchAccept(msg: RematchAcceptMessage) {
    if (msg.playerId !== this.opponentId) return;
    if (this.onRematchAccept) {
      this.onRematchAccept();
    }
  }

  private handleUndoRequest(msg: UndoRequestMessage) {
    if (msg.playerId !== this.opponentId) return;
    if (this.onUndoRequest) {
      this.onUndoRequest();
    }
  }

  private handleUndoAccept(msg: UndoAcceptMessage) {
    if (msg.playerId !== this.opponentId) return;
    if (this.onUndoAccept) {
      this.onUndoAccept();
    }
  }

  private handleUndoReject(msg: UndoRejectMessage) {
    if (msg.playerId !== this.opponentId) return;
    if (this.onUndoReject) {
      this.onUndoReject();
    }
  }

  private handleHeartbeat(msg: HeartbeatMessage) {
    if (msg.playerId === this.opponentId) {
      this.lastHeartbeat = Date.now();
      if (!this.opponentConnected) {
        this.opponentConnected = true;
        if (this.onOpponentJoin) {
          this.onOpponentJoin();
        }
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.roomId) {
        this.sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatCheckTimer = setInterval(() => {
      if (this.opponentId && this.opponentConnected) {
        const now = Date.now();
        if (now - this.lastHeartbeat > HEARTBEAT_TIMEOUT) {
          this.opponentConnected = false;
          if (this.onOpponentLeave) {
            this.onOpponentLeave();
          }
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

  async createRoom(playerName?: string): Promise<string> {
    if (playerName) {
      this.myPlayerName = playerName;
    }

    const roomId = generateRoomId();
    await connect(this.myPlayerId);

    this.roomId = roomId;
    this.isHost = true;
    this.myColor = 'red';
    this.opponentConnected = false;
    this.opponentId = null;
    this.opponentName = null;

    const topic = getTopic(roomId);
    this.messageHandler = this.handleMessage;
    subscribe(topic, this.messageHandler);

    this.startHeartbeat();

    return roomId;
  }

  async joinRoom(roomId: string, playerName?: string): Promise<{ color: PieceColor; boardState?: Piece[]; currentPlayer?: PieceColor }> {
    if (playerName) {
      this.myPlayerName = playerName;
    }

    await connect(this.myPlayerId);

    this.roomId = roomId;
    this.isHost = false;
    this.myColor = null;
    this.opponentConnected = false;
    this.opponentId = null;
    this.opponentName = null;

    const topic = getTopic(roomId);
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
    if (this.roomId) {
      this.sendLeave();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stopHeartbeat();

    if (this.roomId && this.messageHandler) {
      const topic = getTopic(this.roomId);
      unsubscribe(topic);
      this.messageHandler = null;
    }

    disconnect();

    this.roomId = null;
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

  sendMove(from: { col: number; row: number }, to: { col: number; row: number }, pieceId: string): void {
    if (!this.roomId) return;

    const msg: MoveMessage = {
      type: 'move',
      playerId: this.myPlayerId,
      from,
      to,
      pieceId,
    };

    publish(getTopic(this.roomId), msg);
  }

  sendResign(): void {
    if (!this.roomId) return;

    const msg: ResignMessage = {
      type: 'resign',
      playerId: this.myPlayerId,
    };

    publish(getTopic(this.roomId), msg);
  }

  sendRematchRequest(): void {
    if (!this.roomId) return;

    const msg: RematchRequestMessage = {
      type: 'rematch_request',
      playerId: this.myPlayerId,
    };

    publish(getTopic(this.roomId), msg);
  }

  sendRematchAccept(): void {
    if (!this.roomId) return;

    const msg: RematchAcceptMessage = {
      type: 'rematch_accept',
      playerId: this.myPlayerId,
    };

    publish(getTopic(this.roomId), msg);
  }

  sendUndoRequest(): void {
    if (!this.roomId) return;

    const msg: UndoRequestMessage = {
      type: 'undo_request',
      playerId: this.myPlayerId,
    };

    publish(getTopic(this.roomId), msg);
  }

  sendUndoAccept(): void {
    if (!this.roomId) return;

    const msg: UndoAcceptMessage = {
      type: 'undo_accept',
      playerId: this.myPlayerId,
    };

    publish(getTopic(this.roomId), msg);
  }

  sendUndoReject(): void {
    if (!this.roomId) return;

    const msg: UndoRejectMessage = {
      type: 'undo_reject',
      playerId: this.myPlayerId,
    };

    publish(getTopic(this.roomId), msg);
  }

  sendJoinAckWithBoard(opponentId: string, boardState: Piece[], currentPlayer: PieceColor): void {
    if (!this.roomId || !this.myColor) return;

    const msg: JoinAckMessage = {
      type: 'join_ack',
      playerId: this.myPlayerId,
      playerName: this.myPlayerName,
      color: this.myColor,
      boardState,
      currentPlayer,
    };

    publish(getTopic(this.roomId), msg);
  }

  private sendJoin(): void {
    if (!this.roomId) return;

    const msg: JoinMessage = {
      type: 'join',
      playerId: this.myPlayerId,
      playerName: this.myPlayerName,
    };

    publish(getTopic(this.roomId), msg);
  }

  private sendLeave(): void {
    if (!this.roomId) return;

    const msg: LeaveMessage = {
      type: 'leave',
      playerId: this.myPlayerId,
    };

    publish(getTopic(this.roomId), msg);
  }

  private sendHeartbeat(): void {
    if (!this.roomId) return;

    const msg: HeartbeatMessage = {
      type: 'heartbeat',
      playerId: this.myPlayerId,
      timestamp: Date.now(),
    };

    publish(getTopic(this.roomId), msg);
  }
}

export const roomManager = new RoomManager();
