import { v4 as uuidv4 } from 'uuid';
import {
  GameRoom, GameState, GameStatus, Color, Move, Position,
  createInitialGameState, makeMove as applyGameMove,
  getLegalMovesForPiece,
} from 'spherical-chess-shared';

interface InternalRoom extends GameRoom {
  whiteSocketId: string | null;
  blackSocketId: string | null;
}

export class GameManager {
  private rooms = new Map<string, InternalRoom>();
  private playerRooms = new Map<string, string>(); // socketId -> roomId

  createRoom(socketId: string, playerName: string): GameRoom {
    const id = uuidv4().slice(0, 8);
    const room: InternalRoom = {
      id,
      white: playerName,
      black: null,
      state: createInitialGameState(),
      createdAt: Date.now(),
      whiteSocketId: socketId,
      blackSocketId: null,
    };
    room.state.status = GameStatus.Waiting;
    this.rooms.set(id, room);
    this.playerRooms.set(socketId, id);
    return this.toPublicRoom(room);
  }

  joinRoom(roomId: string, socketId: string, playerName: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || room.blackSocketId) return null;

    room.black = playerName;
    room.blackSocketId = socketId;
    room.state.status = GameStatus.Active;
    this.playerRooms.set(socketId, roomId);

    return this.toPublicRoom(room);
  }

  createMatchedRoom(
    whiteSocketId: string,
    whiteName: string,
    blackSocketId: string,
    blackName: string,
  ): GameRoom {
    const id = uuidv4().slice(0, 8);
    const room: InternalRoom = {
      id,
      white: whiteName,
      black: blackName,
      state: createInitialGameState(),
      createdAt: Date.now(),
      whiteSocketId,
      blackSocketId,
    };
    this.rooms.set(id, room);
    this.playerRooms.set(whiteSocketId, id);
    this.playerRooms.set(blackSocketId, id);
    return this.toPublicRoom(room);
  }

  makeMove(
    roomId: string,
    socketId: string,
    move: Move,
  ): { state: GameState; move: Move } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Verify it's this player's turn
    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor || playerColor !== room.state.turn) return null;

    const newState = applyGameMove(room.state, move);
    if (!newState) return null;

    room.state = newState;
    return { state: newState, move };
  }

  getValidMoves(roomId: string, socketId: string, position: Position): Move[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor || playerColor !== room.state.turn) return [];

    return getLegalMovesForPiece(room.state, position);
  }

  resign(roomId: string, socketId: string): GameState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerColor = this.getPlayerColor(room, socketId);
    if (!playerColor) return null;

    room.state.status = GameStatus.Resigned;
    room.state.winner = playerColor === Color.White ? Color.Black : Color.White;
    return room.state;
  }

  getPlayerRoom(socketId: string): string | undefined {
    return this.playerRooms.get(socketId);
  }

  handleDisconnect(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.state.status === GameStatus.Active || room.state.status === GameStatus.Check) {
      const playerColor = this.getPlayerColor(room, socketId);
      if (playerColor) {
        room.state.status = GameStatus.Resigned;
        room.state.winner = playerColor === Color.White ? Color.Black : Color.White;
      }
    }

    this.playerRooms.delete(socketId);

    // Clean up room if both disconnected
    if (
      (!room.whiteSocketId || !this.playerRooms.has(room.whiteSocketId)) &&
      (!room.blackSocketId || !this.playerRooms.has(room.blackSocketId))
    ) {
      this.rooms.delete(roomId);
    }
  }

  getActiveGameCount(): number {
    return this.rooms.size;
  }

  getActiveGames(): { id: string; players: number; status: string }[] {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      players: (room.whiteSocketId ? 1 : 0) + (room.blackSocketId ? 1 : 0),
      status: room.state.status,
    }));
  }

  private getPlayerColor(room: InternalRoom, socketId: string): Color | null {
    if (room.whiteSocketId === socketId) return Color.White;
    if (room.blackSocketId === socketId) return Color.Black;
    return null;
  }

  private toPublicRoom(room: InternalRoom): GameRoom {
    return {
      id: room.id,
      white: room.white,
      black: room.black,
      state: room.state,
      createdAt: room.createdAt,
    };
  }
}
