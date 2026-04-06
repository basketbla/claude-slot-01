import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GameState, Position, Move, Color, Piece } from 'spherical-chess-shared';

// Unicode chess pieces
const PIECE_SYMBOLS: Record<string, Record<string, string>> = {
  white: { K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659' },
  black: { K: '\u265A', Q: '\u265B', R: '\u265C', B: '\u265D', N: '\u265E', P: '\u265F' },
};

interface ChessSphereProps {
  gameState: GameState;
  playerColor: Color | null;
  validMoves: Move[];
  selectedSquare: Position | null;
  onSquareClick: (pos: Position) => void;
}

const SPHERE_RADIUS = 3;
const ROWS = 8;
const COLS = 8;

/**
 * Convert board file/rank to spherical coordinates on the sphere surface.
 * The sphere's equator corresponds to ranks 4-5, poles at rank extremes.
 */
function boardToSphere(file: number, rank: number): THREE.Vector3 {
  // Map rank 0-7 to latitude (phi): south pole to north pole
  // phi goes from ~15deg to ~165deg (avoid exact poles for rendering)
  const phi = ((7 - rank + 0.5) / 8) * Math.PI; // 0 = north, PI = south

  // Map file 0-7 to longitude (theta): full 360 degrees
  const theta = ((file + 0.5) / 8) * Math.PI * 2;

  return new THREE.Vector3(
    SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
    SPHERE_RADIUS * Math.cos(phi),
    SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * Get the 4 corners of a square on the sphere for geometry building.
 */
function getSquareCorners(file: number, rank: number): THREE.Vector3[] {
  const corners: THREE.Vector3[] = [];

  for (const [df, dr] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const f = (file + df) / 8;
    const r = (rank + dr) / 8;

    const phi = (1 - r) * Math.PI;
    const theta = f * Math.PI * 2;

    corners.push(
      new THREE.Vector3(
        SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
        SPHERE_RADIUS * Math.cos(phi),
        SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
      )
    );
  }

  return corners;
}

/**
 * Create a subdivided quad on the sphere surface for a single square.
 */
function createSquareGeometry(file: number, rank: number, subdivisions: number = 8): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i <= subdivisions; i++) {
    for (let j = 0; j <= subdivisions; j++) {
      const u = (file + j / subdivisions) / 8;
      const v = (rank + i / subdivisions) / 8;

      const phi = (1 - v) * Math.PI;
      const theta = u * Math.PI * 2;

      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.cos(phi);
      const z = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      // Normal points outward from sphere center
      const len = Math.sqrt(x * x + y * y + z * z);
      normals.push(x / len, y / len, z / len);
    }
  }

  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < subdivisions; j++) {
      const a = i * (subdivisions + 1) + j;
      const b = a + 1;
      const c = a + (subdivisions + 1);
      const d = c + 1;

      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  return geometry;
}

/** A single board square rendered on the sphere surface. */
function BoardSquare({
  file,
  rank,
  isLight,
  isSelected,
  isValidMove,
  isLastMove,
  piece,
  onClick,
}: {
  file: number;
  rank: number;
  isLight: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  isLastMove: boolean;
  piece: Piece | null;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const geometry = useMemo(() => createSquareGeometry(file, rank), [file, rank]);
  const center = useMemo(() => boardToSphere(file, rank), [file, rank]);

  let color: string;
  if (isSelected) {
    color = '#f7c948';
  } else if (isValidMove) {
    color = '#7bc96f';
  } else if (isLastMove) {
    color = '#b8d4e3';
  } else if (hovered) {
    color = isLight ? '#f0d9b5' : '#b58863';
  } else {
    color = isLight ? '#f0d9b5' : '#b58863';
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerDown={(e) => {
          e.stopPropagation();
          pointerDownPos.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (pointerDownPos.current) {
            const dx = e.clientX - pointerDownPos.current.x;
            const dy = e.clientY - pointerDownPos.current.y;
            if (dx * dx + dy * dy < 25) {
              onClick();
            }
          }
          pointerDownPos.current = null;
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={color}
          side={THREE.DoubleSide}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {isValidMove && !piece && (
        <mesh position={center.clone().multiplyScalar(1.01)}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#4a7" transparent opacity={0.8} />
        </mesh>
      )}

      {piece && (
        <Html
          position={center.clone().multiplyScalar(1.05)}
          center
          style={{
            fontSize: '28px',
            userSelect: 'none',
            pointerEvents: 'none',
            textShadow: piece.color === 'white'
              ? '0 0 4px rgba(0,0,0,0.8)'
              : '0 0 4px rgba(255,255,255,0.5)',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
          }}
          zIndexRange={[10, 0]}
        >
          {PIECE_SYMBOLS[piece.color][piece.type]}
        </Html>
      )}
    </group>
  );
}

/** Coordinate labels around the equator and along a meridian. */
function BoardLabels() {
  const labels: React.ReactNode[] = [];
  const files = 'abcdefgh';

  for (let f = 0; f < 8; f++) {
    const pos = boardToSphere(f, -0.6);
    labels.push(
      <Text
        key={`file-${f}`}
        position={[pos.x * 1.12, pos.y * 1.12, pos.z * 1.12]}
        fontSize={0.2}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        {files[f]}
      </Text>
    );
  }

  for (let r = 0; r < 8; r++) {
    const pos = boardToSphere(-0.6, r);
    labels.push(
      <Text
        key={`rank-${r}`}
        position={[pos.x * 1.12, pos.y * 1.12, pos.z * 1.12]}
        fontSize={0.2}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        {String(r + 1)}
      </Text>
    );
  }

  return <>{labels}</>;
}

/** The full 3D sphere board scene. */
function SphereBoardScene({
  gameState,
  playerColor,
  validMoves,
  selectedSquare,
  onSquareClick,
}: ChessSphereProps) {
  const lastMove = gameState.moveHistory.length > 0
    ? gameState.moveHistory[gameState.moveHistory.length - 1]
    : null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />

      {/* Transparent inner sphere for reference */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS * 0.98, 64, 64]} />
        <meshStandardMaterial
          color="#2a2a3e"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Board squares */}
      {Array.from({ length: 8 }, (_, file) =>
        Array.from({ length: 8 }, (_, rank) => {
          const isLight = (file + rank) % 2 === 0;
          const pos: Position = { file, rank };
          const isSelected = selectedSquare?.file === file && selectedSquare?.rank === rank;
          const isValidMove = validMoves.some(m => m.to.file === file && m.to.rank === rank);
          const isLastMove = lastMove
            ? (lastMove.from.file === file && lastMove.from.rank === rank) ||
            (lastMove.to.file === file && lastMove.to.rank === rank)
            : false;

          return (
            <BoardSquare
              key={`${file}-${rank}`}
              file={file}
              rank={rank}
              isLight={isLight}
              isSelected={isSelected}
              isValidMove={isValidMove}
              isLastMove={isLastMove}
              piece={gameState.board[file][rank]}
              onClick={() => onSquareClick(pos)}
            />
          );
        })
      )}

      <BoardLabels />

      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        rotateSpeed={0.5}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

export default function ChessSphere(props: ChessSphereProps) {
  return (
    <Canvas
      camera={{
        position: [0, 3, 7],
        fov: 50,
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <SphereBoardScene {...props} />
    </Canvas>
  );
}
