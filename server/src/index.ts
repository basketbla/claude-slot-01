import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameManager } from './game/GameManager.js';
import { Matchmaker } from './matchmaking/Matchmaker.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Move,
  Position,
} from 'spherical-chess-shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Serve client static files in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const gameManager = new GameManager();
const matchmaker = new Matchmaker(gameManager, io);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', games: gameManager.getActiveGameCount() });
});

// List active games
app.get('/api/games', (_req, res) => {
  res.json(gameManager.getActiveGames());
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('joinQueue', (playerName: string) => {
    matchmaker.addToQueue(socket, playerName);
  });

  socket.on('leaveQueue', () => {
    matchmaker.removeFromQueue(socket.id);
  });

  socket.on('createPrivateGame', (playerName: string) => {
    const room = gameManager.createRoom(socket.id, playerName);
    socket.join(room.id);
    socket.emit('gameCreated', room);
  });

  socket.on('joinPrivateGame', (roomId: string, playerName: string) => {
    const room = gameManager.joinRoom(roomId, socket.id, playerName);
    if (!room) {
      socket.emit('error', 'Game not found or full');
      return;
    }
    socket.join(roomId);
    io.to(roomId).emit('gameStart', room);
  });

  socket.on('makeMove', (roomId: string, move: Move) => {
    const result = gameManager.makeMove(roomId, socket.id, move);
    if (!result) {
      socket.emit('error', 'Invalid move');
      return;
    }
    io.to(roomId).emit('gameUpdate', result.state, result.move);
    if (result.state.status === 'checkmate' || result.state.status === 'stalemate' || result.state.status === 'draw') {
      io.to(roomId).emit('gameOver', result.state);
    }
  });

  socket.on('requestValidMoves', (roomId: string, position: Position) => {
    const moves = gameManager.getValidMoves(roomId, socket.id, position);
    socket.emit('validMoves', moves);
  });

  socket.on('resign', (roomId: string) => {
    const result = gameManager.resign(roomId, socket.id);
    if (result) {
      io.to(roomId).emit('gameOver', result);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    matchmaker.removeFromQueue(socket.id);

    const roomId = gameManager.getPlayerRoom(socket.id);
    if (roomId) {
      io.to(roomId).emit('opponentDisconnected');
      gameManager.handleDisconnect(roomId, socket.id);
    }
  });
});

// SPA fallback — serve index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Spherical Chess server running on port ${PORT}`);
});
