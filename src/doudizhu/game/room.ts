import { connect, disconnect, subscribe, unsubscribe, publish } from './mqtt';
import type { Card } from './types';
import { createDeck, dealCards, sortCards } from './deck';

export type RoomMessageType =
  | 'join'
  | 'join_ack'
  | 'room_state'
  | 'seat_change'
  | 'leave'
  | 'start_game'
  | 'deal'
  | 'bid'
  | 'play'
  | 'pass'
  | 'game_over'
  | 'rematch_request'
  | 'rematch_accept'
  | 'undo_request'
  | 'undo_accept'
  | 'undo_reject'
  | 'heartbeat';

export interface RoomPlayer {
  playerId: string;
  playerName: string;
  seatIndex: number;
  isHost: boolean;
  isReady: boolean;
  isBot?: boolean;
}

export interface RoomState {
  roomId: string;
  players: RoomPlayer[];
  gameStarted: boolean;
}

export interface DealData {
  seatIndex: number;
  cards: Card[];
  bottomCards: Card[];
  firstBidderSeat: number;
}

export interface BidData {
  seatIndex: number;
  score: number;
}

export interface PlayData {
  seatIndex: number;
  cardIds: string[];
  cards?: Card[];
}

export interface PassData {
  seatIndex: number;
}

export interface GameOverData {
  winner: 'landlord' | 'farmer';
  landlordSeat: number;
}

const HEARTBEAT_INTERVAL = 5000;
const HEARTBEAT_TIMEOUT = 15000;
const JOIN_ACK_TIMEOUT = 5000;

function generatePlayerId(): string {
  return `player_${Math.random().toString(36).slice(2, 10)}`;
}

function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTopic(roomId: string): string {
  return `doudizhu/room/${roomId}`;
}

export class RoomManager {
  roomId: string | null = null;
  myPlayerId: string;
  myPlayerName: string = '玩家';
  mySeatIndex: number = -1;
  isHost: boolean = false;

  roomState: RoomState | null = null;

  onRoomStateChange: ((state: RoomState) => void) | null = null;
  onGameStart: (() => void) | null = null;
  onDeal: ((data: DealData) => void) | null = null;
  onDealBots: ((hands: Record<number, Card[]>, bottomCards: Card[]) => void) | null = null;
  onBid: ((data: BidData) => void) | null = null;
  onPlay: ((data: PlayData) => void) | null = null;
  onPass: ((data: PassData) => void) | null = null;
  onGameOver: ((data: GameOverData) => void) | null = null;
  onRematchRequest: ((playerId: string) => void) | null = null;
  onUndoRequest: ((playerId: string) => void) | null = null;
  onUndoAccept: ((playerId: string) => void) | null = null;
  onUndoReject: ((playerId: string) => void) | null = null;
  onOpponentLeave: ((playerId: string) => void) | null = null;
  onError: ((error: string) => void) | null = null;

  private lastHeartbeats = new Map<string, number>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatCheckTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandler: ((msg: any) => void) | null = null;
  private joinAckResolver: ((value: RoomState) => void) | null = null;
  private joinAckRejecter: ((reason: Error) => void) | null = null;
  private joinAckTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.myPlayerId = generatePlayerId();
  }

  private handleMessage = (msg: any) => {
    if (!msg || !msg.type || !msg.playerId) return;
    if (msg.playerId === this.myPlayerId) {
      if (msg.type === 'heartbeat') return;
      return;
    }

    if (msg.type !== 'heartbeat') {
      this.lastHeartbeats.set(msg.playerId, Date.now());
    }

    switch (msg.type) {
      case 'join':
        this.handleJoin(msg);
        break;
      case 'join_ack':
        this.handleJoinAck(msg);
        break;
      case 'room_state':
        this.handleRoomState(msg);
        break;
      case 'seat_change':
        this.handleSeatChange(msg);
        break;
      case 'leave':
        this.handleLeave(msg);
        break;
      case 'start_game':
        this.handleStartGame(msg);
        break;
      case 'deal':
        this.handleDeal(msg);
        break;
      case 'deal_bots':
        if (this.onDealBots) this.onDealBots(msg.hands, msg.bottomCards);
        break;
      case 'bid':
        this.handleBid(msg);
        break;
      case 'play':
        this.handlePlay(msg);
        break;
      case 'pass':
        this.handlePass(msg);
        break;
      case 'game_over':
        this.handleGameOver(msg);
        break;
      case 'rematch_request':
        this.handleRematchRequest(msg);
        break;
      case 'rematch_accept':
        this.handleRematchAccept(msg);
        break;
      case 'undo_request':
        this.handleUndoRequest(msg);
        break;
      case 'undo_accept':
        this.handleUndoAccept(msg);
        break;
      case 'undo_reject':
        this.handleUndoReject(msg);
        break;
      case 'heartbeat':
        this.handleHeartbeat(msg);
        break;
    }
  };

  private handleJoin(msg: any) {
    if (!this.isHost) return;
    if (!this.roomState) return;

    const existingPlayer = this.roomState.players.find(p => p.playerId === msg.playerId);
    if (existingPlayer) return;

    const availableSeat = this.findAvailableSeat();
    if (availableSeat === -1) return;

    const newPlayer: RoomPlayer = {
      playerId: msg.playerId,
      playerName: msg.playerName,
      seatIndex: availableSeat,
      isHost: false,
      isReady: false,
    };

    const newState: RoomState = {
      ...this.roomState,
      players: [...this.roomState.players, newPlayer],
    };

    this.roomState = newState;
    this.lastHeartbeats.set(msg.playerId, Date.now());

    this.sendJoinAck(msg.playerId);
    this.broadcastRoomState();

    if (this.onRoomStateChange) {
      this.onRoomStateChange(newState);
    }
  }

  private handleJoinAck(msg: any) {
    if (this.joinAckResolver) {
      const roomState: RoomState = msg.roomState;
      this.roomState = roomState;
      this.mySeatIndex = roomState.players.find(p => p.playerId === this.myPlayerId)?.seatIndex ?? -1;
      this.isHost = false;

      roomState.players.forEach(p => {
        if (p.playerId !== this.myPlayerId) {
          this.lastHeartbeats.set(p.playerId, Date.now());
        }
      });

      this.joinAckResolver(roomState);
      this.joinAckResolver = null;
      this.joinAckRejecter = null;
      if (this.joinAckTimer) {
        clearTimeout(this.joinAckTimer);
        this.joinAckTimer = null;
      }

      if (this.onRoomStateChange) {
        this.onRoomStateChange(roomState);
      }
    }
  }

  private handleRoomState(msg: any) {
    if (msg.roomState) {
      this.roomState = msg.roomState;
      const me = msg.roomState.players.find((p: RoomPlayer) => p.playerId === this.myPlayerId);
      if (me) {
        this.mySeatIndex = me.seatIndex;
        this.isHost = me.isHost;
      }
      if (this.onRoomStateChange) {
        this.onRoomStateChange(msg.roomState);
      }
    }
  }

  private handleSeatChange(msg: any) {
    if (!this.roomState) return;

    const player = this.roomState.players.find(p => p.playerId === msg.playerId);
    if (!player) return;

    const targetSeat = msg.targetSeat;
    const seatOccupied = this.roomState.players.some(p => p.seatIndex === targetSeat && p.playerId !== msg.playerId);
    if (seatOccupied) return;

    const newPlayers = this.roomState.players.map(p =>
      p.playerId === msg.playerId ? { ...p, seatIndex: targetSeat } : p
    );

    const newState: RoomState = {
      ...this.roomState,
      players: newPlayers,
    };

    this.roomState = newState;

    if (this.isHost) {
      this.broadcastRoomState();
    }

    if (this.onRoomStateChange) {
      this.onRoomStateChange(newState);
    }
  }

  private handleLeave(msg: any) {
    if (!this.roomState) return;

    const leavingPlayer = this.roomState.players.find(p => p.playerId === msg.playerId);
    if (!leavingPlayer) return;

    const newPlayers = this.roomState.players.filter(p => p.playerId !== msg.playerId);
    this.lastHeartbeats.delete(msg.playerId);

    let wasHost = leavingPlayer.isHost;
    let finalPlayers = newPlayers;

    if (wasHost && newPlayers.length > 0) {
      const sortedPlayers = [...newPlayers].sort((a, b) => a.seatIndex - b.seatIndex);
      sortedPlayers[0] = { ...sortedPlayers[0], isHost: true };
      finalPlayers = sortedPlayers;

      if (sortedPlayers[0].playerId === this.myPlayerId) {
        this.isHost = true;
      }
    }

    const newState: RoomState = {
      ...this.roomState,
      players: finalPlayers,
    };

    this.roomState = newState;

    if (this.isHost) {
      this.broadcastRoomState();
    }

    if (this.onOpponentLeave) {
      this.onOpponentLeave(msg.playerId);
    }

    if (this.onRoomStateChange) {
      this.onRoomStateChange(newState);
    }
  }

  private handleStartGame(msg: any) {
    if (!this.isHost && this.roomState) {
      this.roomState = { ...this.roomState, gameStarted: true };
    }
    if (this.onGameStart) {
      this.onGameStart();
    }
  }

  private handleDeal(msg: any) {
    if (msg.targetSeatIndex === this.mySeatIndex || msg.targetSeatIndex === -1) {
      if (this.onDeal) {
        this.onDeal({
          seatIndex: msg.seatIndex ?? this.mySeatIndex,
          cards: msg.cards || [],
          bottomCards: msg.bottomCards || [],
          firstBidderSeat: msg.firstBidderSeat ?? 0,
        });
      }
    }
  }

  private handleBid(msg: any) {
    if (this.onBid) {
      this.onBid({
        seatIndex: msg.seatIndex,
        score: msg.score,
      });
    }
  }

  private handlePlay(msg: any) {
    if (this.onPlay) {
      this.onPlay({
        seatIndex: msg.seatIndex,
        cardIds: msg.cardIds,
      });
    }
  }

  private handlePass(msg: any) {
    if (this.onPass) {
      this.onPass({
        seatIndex: msg.seatIndex,
      });
    }
  }

  private handleGameOver(msg: any) {
    if (this.onGameOver) {
      this.onGameOver({
        winner: msg.winner,
        landlordSeat: msg.landlordSeat,
      });
    }
  }

  private handleRematchRequest(msg: any) {
    if (this.onRematchRequest) {
      this.onRematchRequest(msg.playerId);
    }
  }

  private handleRematchAccept(msg: any) {
    // 可以扩展处理
  }

  private handleUndoRequest(msg: any) {
    if (this.onUndoRequest) {
      this.onUndoRequest(msg.playerId);
    }
  }

  private handleUndoAccept(msg: any) {
    if (this.onUndoAccept) {
      this.onUndoAccept(msg.playerId);
    }
  }

  private handleUndoReject(msg: any) {
    if (this.onUndoReject) {
      this.onUndoReject(msg.playerId);
    }
  }

  private handleHeartbeat(msg: any) {
    this.lastHeartbeats.set(msg.playerId, msg.timestamp);
  }

  private findAvailableSeat(): number {
    if (!this.roomState) return -1;
    const occupiedSeats = new Set(this.roomState.players.map(p => p.seatIndex));
    for (let i = 0; i < 3; i++) {
      if (!occupiedSeats.has(i)) return i;
    }
    return -1;
  }

  private broadcastRoomState() {
    if (!this.roomId || !this.roomState) return;
    publish(getTopic(this.roomId), {
      type: 'room_state',
      playerId: this.myPlayerId,
      roomState: this.roomState,
    });
  }

  private sendJoinAck(targetPlayerId: string) {
    if (!this.roomId || !this.roomState) return;
    publish(getTopic(this.roomId), {
      type: 'join_ack',
      playerId: this.myPlayerId,
      targetPlayerId,
      roomState: this.roomState,
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.roomId) {
        this.sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    this.heartbeatCheckTimer = setInterval(() => {
      this.checkHeartbeats();
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

  private checkHeartbeats() {
    if (!this.roomState) return;

    const now = Date.now();
    const disconnectedPlayers: string[] = [];

    this.lastHeartbeats.forEach((lastTime, playerId) => {
      if (now - lastTime > HEARTBEAT_TIMEOUT) {
        disconnectedPlayers.push(playerId);
      }
    });

    for (const playerId of disconnectedPlayers) {
      this.handleLeave({ playerId, type: 'leave' });
    }
  }

  async connect(): Promise<void> {
    await connect(this.myPlayerId);
  }

  async createRoom(playerName: string): Promise<string> {
    this.myPlayerName = playerName;

    const roomId = generateRoomId();
    await connect(this.myPlayerId);

    this.roomId = roomId;
    this.isHost = true;
    this.mySeatIndex = 0;

    const hostPlayer: RoomPlayer = {
      playerId: this.myPlayerId,
      playerName,
      seatIndex: 0,
      isHost: true,
      isReady: true,
    };

    this.roomState = {
      roomId,
      players: [hostPlayer],
      gameStarted: false,
    };

    const topic = getTopic(roomId);
    this.messageHandler = this.handleMessage;
    subscribe(topic, this.messageHandler);

    this.startHeartbeat();

    return roomId;
  }

  async joinRoom(roomId: string, playerName: string): Promise<RoomState> {
    this.myPlayerName = playerName;

    await connect(this.myPlayerId);

    this.roomId = roomId;
    this.isHost = false;
    this.mySeatIndex = -1;

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
        reject(new Error('房间不存在或已满'));
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

  changeSeat(targetSeat: number): void {
    if (!this.roomId || !this.roomState) return;
    if (targetSeat < 0 || targetSeat > 2) return;

    const seatOccupied = this.roomState.players.some(
      p => p.seatIndex === targetSeat && p.playerId !== this.myPlayerId
    );
    if (seatOccupied) return;

    publish(getTopic(this.roomId), {
      type: 'seat_change',
      playerId: this.myPlayerId,
      targetSeat,
    });

    const newPlayers = this.roomState.players.map(p =>
      p.playerId === this.myPlayerId ? { ...p, seatIndex: targetSeat } : p
    );

    this.roomState = {
      ...this.roomState,
      players: newPlayers,
    };
    this.mySeatIndex = targetSeat;

    if (this.onRoomStateChange) {
      this.onRoomStateChange(this.roomState);
    }
  }

  startGame(): void {
    if (!this.roomId || !this.roomState || !this.isHost) return;
    if (this.roomState.players.length < 2) {
      if (this.onError) {
        this.onError('至少需要2名玩家才能开始游戏');
      }
      return;
    }

    this.roomState = { ...this.roomState, gameStarted: true };

    publish(getTopic(this.roomId), {
      type: 'start_game',
      playerId: this.myPlayerId,
    });

    this.dealCardsToAll();

    if (this.onGameStart) {
      this.onGameStart();
    }
  }

  private dealCardsToAll() {
    if (!this.roomState) return;

    const deck = createDeck();
    const { bottom, players: playerCards } = dealCards(deck);
    const sortedPlayers = [...this.roomState.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const firstBidderSeat = sortedPlayers[Math.floor(Math.random() * sortedPlayers.length)].seatIndex;

    const botHands: Record<number, Card[]> = {};

    sortedPlayers.forEach((player, index) => {
      const cards = playerCards[index] || [];
      if (player.isBot) botHands[player.seatIndex] = cards;

      publish(getTopic(this.roomId!), {
        type: 'deal',
        playerId: this.myPlayerId,
        targetSeatIndex: player.seatIndex,
        seatIndex: player.seatIndex,
        cards,
        bottomCards: bottom,
        firstBidderSeat,
      });

      if (player.playerId === this.myPlayerId) {
        if (this.onDeal) {
          this.onDeal({
            seatIndex: player.seatIndex,
            cards: sortCards(cards),
            bottomCards: bottom,
            firstBidderSeat,
          });
        }
      }
    });

    if (Object.keys(botHands).length > 0) {
      publish(getTopic(this.roomId!), {
        type: 'deal_bots',
        playerId: this.myPlayerId,
        hands: botHands,
        bottomCards: bottom,
      });
      if (this.onDealBots) this.onDealBots(botHands, bottom);
    }
  }

  addBot(): number {
    if (!this.isHost || !this.roomId || !this.roomState) return -1;
    if (this.roomState.players.length >= 3) return -1;

    const taken = new Set(this.roomState.players.map(p => p.seatIndex));
    let seat = -1;
    for (let i = 0; i < 3; i++) {
      if (!taken.has(i)) {
        seat = i;
        break;
      }
    }
    if (seat === -1) return -1;

    const bot: RoomPlayer = {
      playerId: `bot_${this.roomId}_${seat}`,
      playerName: `电脑${seat + 1}`,
      seatIndex: seat,
      isHost: false,
      isReady: true,
      isBot: true,
    };

    this.roomState = {
      ...this.roomState,
      players: [...this.roomState.players, bot],
    };
    this.broadcastRoomState();
    return seat;
  }

  removeBot(seat: number): void {
    if (!this.isHost || !this.roomState) return;
    this.roomState = {
      ...this.roomState,
      players: this.roomState.players.filter(p => !(p.isBot && p.seatIndex === seat)),
    };
    this.broadcastRoomState();
  }

  sendBid(score: number): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'bid',
      playerId: this.myPlayerId,
      seatIndex: this.mySeatIndex,
      score,
    });
  }

  sendPlay(cardIds: string[]): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'play',
      playerId: this.myPlayerId,
      seatIndex: this.mySeatIndex,
      cardIds,
    });
  }

  sendPass(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'pass',
      playerId: this.myPlayerId,
      seatIndex: this.mySeatIndex,
    });
  }

  sendBidAs(seatIndex: number, score: 0 | 1 | 2 | 3): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'bid',
      playerId: this.myPlayerId,
      seatIndex,
      score,
    });
  }

  sendPlayAs(seatIndex: number, cards: Card[]): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'play',
      playerId: this.myPlayerId,
      seatIndex,
      cardIds: cards.map(c => c.id),
      cards,
    });
  }

  sendPassAs(seatIndex: number): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'pass',
      playerId: this.myPlayerId,
      seatIndex,
    });
  }

  sendGameOver(winner: 'landlord' | 'farmer', landlordSeat: number): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'game_over',
      playerId: this.myPlayerId,
      winner,
      landlordSeat,
    });
  }

  sendRematchRequest(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'rematch_request',
      playerId: this.myPlayerId,
    });
  }

  acceptRematch(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'rematch_accept',
      playerId: this.myPlayerId,
    });
  }

  sendUndoRequest(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'undo_request',
      playerId: this.myPlayerId,
    });
  }

  sendUndoAccept(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'undo_accept',
      playerId: this.myPlayerId,
    });
  }

  sendUndoReject(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'undo_reject',
      playerId: this.myPlayerId,
    });
  }

  private sendJoin(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'join',
      playerId: this.myPlayerId,
      playerName: this.myPlayerName,
    });
  }

  private sendLeave(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'leave',
      playerId: this.myPlayerId,
    });
  }

  private sendHeartbeat(): void {
    if (!this.roomId) return;

    publish(getTopic(this.roomId), {
      type: 'heartbeat',
      playerId: this.myPlayerId,
      timestamp: Date.now(),
    });
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
    this.mySeatIndex = -1;
    this.isHost = false;
    this.roomState = null;
    this.lastHeartbeats.clear();
    this.joinAckResolver = null;
    this.joinAckRejecter = null;

    if (this.joinAckTimer) {
      clearTimeout(this.joinAckTimer);
      this.joinAckTimer = null;
    }
  }

  disconnect(): void {
    this.leaveRoom();
  }
}

export const roomManager = new RoomManager();
