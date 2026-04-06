# Architecture

## Overview

Spherical Chess is a monorepo with four packages:

```
spherical-chess/
├── shared/      # Game engine, types, move validation
├── server/      # Node.js game server with matchmaking
├── client/      # React + Three.js web client
└── mobile/      # React Native Expo mobile client
```

## Package Details

### `shared/` - Game Engine

The core game logic, used by both server and clients.

**Key files:**
- `src/types.ts` - All TypeScript types and interfaces (pieces, positions, moves, game state, socket events)
- `src/board.ts` - Board representation, coordinate wrapping (pole/file logic), position utilities
- `src/moves.ts` - Move generation, validation, check detection, legal move filtering

**Board Model:**
- 8x8 array indexed by `[file][rank]` (0-indexed)
- `wrapPosition(file, rank)` handles spherical coordinate wrapping
- `wrapFile(file)` handles horizontal cylinder wrapping

**Move Generation:**
1. `pseudoLegalMovesForPiece()` generates all moves without checking for leaving king in check
2. `getLegalMoves()` / `getLegalMovesForPiece()` filters out moves that leave the king in check
3. `makeMove()` validates and applies a move, returning the new game state
4. `isSquareAttacked()` checks if any opponent piece attacks a square (used for check detection and castling)

### `server/` - Game Server

Express + Socket.IO server handling multiplayer games.

**Key files:**
- `src/index.ts` - Server entry point, socket event handlers
- `src/game/GameManager.ts` - Room creation, move processing, player management
- `src/matchmaking/Matchmaker.ts` - Queue-based matchmaking with random color assignment

**Game Flow:**
1. Player connects via WebSocket
2. Player joins matchmaking queue or creates/joins private room
3. When matched, both players receive `gameStart` event with initial state
4. Players send `makeMove` events; server validates and broadcasts updates
5. Game ends on checkmate, stalemate, draw, or resignation

**API Endpoints:**
- `GET /api/health` - Server health check
- `GET /api/games` - List active games

### `client/` - Web Client

React application with Three.js 3D rendering.

**Key files:**
- `src/App.tsx` - Main app component, screen management, game logic coordination
- `src/three/ChessSphere.tsx` - 3D sphere board rendering with interactive squares
- `src/components/Lobby.tsx` - Main menu with quick match, private games, local play
- `src/components/GameUI.tsx` - HUD overlay showing game status, move history
- `src/components/WaitingRoom.tsx` - Room code display while waiting for opponent
- `src/hooks/useSocket.ts` - Socket.IO connection management

**3D Rendering:**
- Board squares are subdivided quads mapped onto a sphere surface using spherical coordinates
- `boardToSphere(file, rank)` converts grid positions to 3D sphere coordinates
- `createSquareGeometry()` creates curved geometry that follows the sphere surface
- Pieces rendered as HTML overlays positioned at square centers via `@react-three/drei`'s `<Html>` component
- `OrbitControls` from drei provides mouse/touch rotation, zoom, with damping

**Coordinate Mapping:**
- Rank maps to latitude (phi): rank 0 = south pole, rank 7 = north pole
- File maps to longitude (theta): 0-7 maps to 0-360 degrees
- Each square is a curved patch on the sphere, subdivided for smooth curvature

### `mobile/` - Mobile Client

React Native Expo application for iOS and Android.

**Key files:**
- `App.tsx` - Complete mobile application

**Features:**
- 2D interactive board for precise piece selection on touchscreens
- 3D sphere preview using expo-gl and expo-three (auto-rotating view)
- Wrapping indicators showing pole connections
- Socket.IO integration for online play
- Local play support

## Communication Protocol

All real-time communication uses Socket.IO.

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `joinQueue` | `playerName: string` | Join matchmaking queue |
| `leaveQueue` | - | Leave matchmaking queue |
| `createPrivateGame` | `playerName: string` | Create a private game room |
| `joinPrivateGame` | `roomId, playerName` | Join an existing private room |
| `makeMove` | `roomId, move` | Submit a move |
| `requestValidMoves` | `roomId, position` | Get legal moves for a piece |
| `resign` | `roomId` | Resign the game |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `matchFound` | `roomId, color` | Matched with an opponent |
| `gameStart` | `GameRoom` | Game is starting |
| `gameUpdate` | `GameState, Move` | A move was made |
| `gameOver` | `GameState` | Game has ended |
| `validMoves` | `Move[]` | Legal moves for requested piece |
| `error` | `string` | Error message |
| `opponentDisconnected` | - | Opponent left the game |

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript |
| Build tool | npm workspaces |
| Server runtime | Node.js |
| Server framework | Express |
| WebSocket | Socket.IO |
| Web UI | React 18 |
| 3D rendering | Three.js via @react-three/fiber |
| 3D utilities | @react-three/drei |
| Web bundler | Vite |
| Mobile framework | React Native (Expo) |
| Mobile 3D | expo-gl + expo-three |
