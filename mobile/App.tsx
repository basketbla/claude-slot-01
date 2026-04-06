import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';
import {
  type Position,
  type Move,
  type GameState,
  type Piece,
  type Color,
  GameStatus,
  PieceType,
  createInitialGameState,
  getLegalMovesForPiece,
  makeMove as applyLocalMove,
} from 'spherical-chess-shared';
import { io, Socket } from 'socket.io-client';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SPHERE_RADIUS = 3;

// Piece symbols for rendering
const PIECE_TEXT: Record<string, Record<string, string>> = {
  white: { K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659' },
  black: { K: '\u265A', Q: '\u265B', R: '\u265C', B: '\u265D', N: '\u265E', P: '\u265F' },
};

type Screen = 'lobby' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const socketRef = useRef<Socket | null>(null);
  const [isLocalGame, setIsLocalGame] = useState(false);
  const [playerColor, setPlayerColor] = useState<Color | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Rotation state for 3D view
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const touchStartRef = useRef({ x: 0, y: 0 });

  const startLocalGame = useCallback(() => {
    setIsLocalGame(true);
    setGameState(createInitialGameState());
    setScreen('game');
  }, []);

  const connectToServer = useCallback(() => {
    if (socketRef.current) socketRef.current.disconnect();

    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on('matchFound', (_roomId: string, color: Color) => {
      setPlayerColor(color);
      setRoomId(_roomId);
    });

    socket.on('gameStart', (room: any) => {
      setGameState(room.state);
      setRoomId(room.id);
      setScreen('game');
    });

    socket.on('gameUpdate', (state: GameState) => {
      setGameState(state);
      setSelectedSquare(null);
      setValidMoves([]);
    });

    socket.on('gameOver', (state: GameState) => {
      setGameState(state);
      Alert.alert('Game Over', `Status: ${state.status}${state.winner ? ` - ${state.winner} wins!` : ''}`);
    });

    socket.emit('joinQueue', playerName || 'Player');
  }, [serverUrl, playerName]);

  const handleSquareSelect = useCallback((pos: Position) => {
    if (!gameState) return;

    // If clicking a valid move target
    if (selectedSquare && validMoves.some(m => m.to.file === pos.file && m.to.rank === pos.rank)) {
      const move = validMoves.find(m => m.to.file === pos.file && m.to.rank === pos.rank)!;

      if (isLocalGame) {
        const newState = applyLocalMove(gameState, move);
        if (newState) setGameState(newState);
      } else if (socketRef.current && roomId) {
        socketRef.current.emit('makeMove', roomId, move);
      }

      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Select own piece
    const piece = gameState.board[pos.file][pos.rank];
    const currentTurn = gameState.turn;

    if (piece && piece.color === currentTurn) {
      if (!isLocalGame && piece.color !== playerColor) return;
      setSelectedSquare(pos);
      setValidMoves(getLegalMovesForPiece(gameState, pos));
      return;
    }

    setSelectedSquare(null);
    setValidMoves([]);
  }, [gameState, selectedSquare, validMoves, isLocalGame, playerColor, roomId]);

  if (screen === 'lobby') {
    return (
      <View style={styles.lobby}>
        <Text style={styles.title}>Spherical Chess</Text>
        <Text style={styles.subtitle}>Chess on a sphere</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#666"
            value={playerName}
            onChangeText={setPlayerName}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={startLocalGame}>
            <Text style={styles.primaryBtnText}>Play Locally</Text>
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Server URL"
            placeholderTextColor="#666"
            value={serverUrl}
            onChangeText={setServerUrl}
          />

          <TouchableOpacity style={styles.secondaryBtn} onPress={connectToServer}>
            <Text style={styles.secondaryBtnText}>Find Online Match</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Game screen - 2D board with touch controls
  // (3D GL view is complex on mobile; we provide a 2D flat board + the web client for full 3D)
  return (
    <View style={styles.game}>
      <View style={styles.gameHeader}>
        <Text style={styles.gameTitle}>Spherical Chess</Text>
        <Text style={styles.turnIndicator}>
          {gameState?.turn === 'white' ? 'White' : 'Black'}'s turn
          {gameState?.status === 'check' ? ' (CHECK!)' : ''}
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { setScreen('lobby'); setGameState(null); }}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>

      {gameState && (
        <View style={styles.boardContainer}>
          <Board
            gameState={gameState}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            onSquarePress={handleSquareSelect}
          />
          <Text style={styles.wrapHint}>
            Files a-h wrap around. Ranks 1 & 8 connect through poles (shifted by 4 files).
          </Text>
        </View>
      )}

      {gameState && gameState.moveHistory.length > 0 && (
        <ScrollView style={styles.moveList} horizontal>
          {gameState.moveHistory.map((m, i) => (
            <Text key={i} style={styles.moveText}>
              {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}
              {m.notation || '...'}{'  '}
            </Text>
          ))}
        </ScrollView>
      )}

      {/* 3D Preview using GLView */}
      <GLView
        style={styles.glView}
        onContextCreate={async (gl) => {
          const renderer = new Renderer({ gl });
          renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0x1a1a2e);

          const camera = new THREE.PerspectiveCamera(50, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
          camera.position.set(0, 3, 7);
          camera.lookAt(0, 0, 0);

          // Add sphere wireframe
          const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
          const wireframe = new THREE.WireframeGeometry(sphereGeo);
          const wireMat = new THREE.LineBasicMaterial({ color: 0x444466 });
          scene.add(new THREE.LineSegments(wireframe, wireMat));

          // Add board squares as colored patches
          for (let file = 0; file < 8; file++) {
            for (let rank = 0; rank < 8; rank++) {
              const isLight = (file + rank) % 2 === 0;
              const phi1 = ((7 - rank) / 8) * Math.PI;
              const phi2 = ((8 - rank) / 8) * Math.PI;
              const theta1 = (file / 8) * Math.PI * 2;
              const theta2 = ((file + 1) / 8) * Math.PI * 2;

              const geo = new THREE.BufferGeometry();
              const verts: number[] = [];
              const subs = 4;
              for (let i = 0; i <= subs; i++) {
                for (let j = 0; j <= subs; j++) {
                  const p = phi1 + (phi2 - phi1) * (i / subs);
                  const t = theta1 + (theta2 - theta1) * (j / subs);
                  verts.push(
                    SPHERE_RADIUS * 1.001 * Math.sin(p) * Math.cos(t),
                    SPHERE_RADIUS * 1.001 * Math.cos(p),
                    SPHERE_RADIUS * 1.001 * Math.sin(p) * Math.sin(t),
                  );
                }
              }
              const idx: number[] = [];
              for (let i = 0; i < subs; i++) {
                for (let j = 0; j < subs; j++) {
                  const a = i * (subs + 1) + j;
                  idx.push(a, a + 1, a + subs + 2, a, a + subs + 2, a + subs + 1);
                }
              }
              geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
              geo.setIndex(idx);
              geo.computeVertexNormals();

              const mat = new THREE.MeshBasicMaterial({
                color: isLight ? 0xf0d9b5 : 0xb58863,
                side: THREE.DoubleSide,
              });
              scene.add(new THREE.Mesh(geo, mat));
            }
          }

          scene.add(new THREE.AmbientLight(0xffffff, 0.8));

          let angle = 0;
          const render = () => {
            requestAnimationFrame(render);
            angle += 0.005;
            camera.position.x = 7 * Math.sin(angle);
            camera.position.z = 7 * Math.cos(angle);
            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
            gl.endFrameEXP();
          };
          render();
        }}
      />
    </View>
  );
}

// 2D Board component for mobile interaction
function Board({
  gameState,
  selectedSquare,
  validMoves,
  onSquarePress,
}: {
  gameState: GameState;
  selectedSquare: Position | null;
  validMoves: Move[];
  onSquarePress: (pos: Position) => void;
}) {
  const squareSize = Math.min(SCREEN_WIDTH - 32, 360) / 8;
  const files = 'abcdefgh';

  return (
    <View>
      {/* Wrapping indicator top */}
      <View style={[styles.wrapRow, { width: squareSize * 8 }]}>
        {Array.from({ length: 8 }, (_, i) => (
          <Text key={i} style={[styles.wrapArrow, { width: squareSize }]}>
            {String.fromCharCode(97 + ((i + 4) % 8))}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row' }}>
        {/* Rank labels */}
        <View>
          {Array.from({ length: 8 }, (_, rank) => (
            <View key={rank} style={{ height: squareSize, justifyContent: 'center' }}>
              <Text style={styles.label}>{8 - rank}</Text>
            </View>
          ))}
        </View>

        {/* Board */}
        <View style={{ flexDirection: 'column' }}>
          {Array.from({ length: 8 }, (_, row) => {
            const rank = 7 - row;
            return (
              <View key={rank} style={{ flexDirection: 'row' }}>
                {Array.from({ length: 8 }, (_, file) => {
                  const isLight = (file + rank) % 2 === 0;
                  const isSelected = selectedSquare?.file === file && selectedSquare?.rank === rank;
                  const isValid = validMoves.some(m => m.to.file === file && m.to.rank === rank);
                  const piece = gameState.board[file][rank];

                  let bg = isLight ? '#f0d9b5' : '#b58863';
                  if (isSelected) bg = '#f7c948';
                  if (isValid) bg = '#7bc96f';

                  return (
                    <TouchableOpacity
                      key={file}
                      style={[styles.square, {
                        width: squareSize,
                        height: squareSize,
                        backgroundColor: bg,
                      }]}
                      onPress={() => onSquarePress({ file, rank })}
                    >
                      {piece && (
                        <Text style={[styles.piece, {
                          fontSize: squareSize * 0.7,
                        }]}>
                          {PIECE_TEXT[piece.color][piece.type]}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>

      {/* File labels */}
      <View style={{ flexDirection: 'row', marginLeft: 20 }}>
        {Array.from({ length: 8 }, (_, i) => (
          <Text key={i} style={[styles.label, { width: squareSize, textAlign: 'center' }]}>
            {files[i]}
          </Text>
        ))}
      </View>

      {/* Wrapping indicator bottom */}
      <View style={[styles.wrapRow, { width: squareSize * 8, marginLeft: 20 }]}>
        {Array.from({ length: 8 }, (_, i) => (
          <Text key={i} style={[styles.wrapArrow, { width: squareSize }]}>
            {String.fromCharCode(97 + ((i + 4) % 8))}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lobby: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#e94560',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  primaryBtn: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  separatorText: {
    color: '#666',
    marginHorizontal: 12,
    fontSize: 12,
  },
  game: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  gameTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  turnIndicator: {
    color: '#7bc96f',
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
  },
  backBtnText: {
    color: '#aaa',
    fontSize: 13,
  },
  boardContainer: {
    alignItems: 'center',
    padding: 8,
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: {
    textAlign: 'center',
  },
  label: {
    color: '#888',
    fontSize: 12,
    width: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  wrapRow: {
    flexDirection: 'row',
    marginLeft: 20,
  },
  wrapArrow: {
    color: '#555',
    fontSize: 10,
    textAlign: 'center',
  },
  wrapHint: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  moveList: {
    maxHeight: 40,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  moveText: {
    color: '#aaa',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  glView: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
