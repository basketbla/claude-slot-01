import React from 'react';
import type { GameState, Color, GameStatus } from 'spherical-chess-shared';

interface GameUIProps {
  gameState: GameState;
  playerColor: Color | null;
  gameOver: boolean;
  opponentDisconnected: boolean;
  onResign: () => void;
}

function getStatusText(state: GameState, playerColor: Color | null): string {
  switch (state.status) {
    case 'checkmate':
      return state.winner === playerColor
        ? 'Checkmate - You win!'
        : 'Checkmate - You lose!';
    case 'stalemate':
      return 'Stalemate - Draw!';
    case 'draw':
      return 'Draw!';
    case 'resigned':
      return state.winner === playerColor
        ? 'Opponent resigned - You win!'
        : 'You resigned';
    case 'check':
      return state.turn === playerColor
        ? 'You are in check!'
        : 'Opponent is in check';
    case 'active':
      return state.turn === playerColor
        ? 'Your turn'
        : "Opponent's turn";
    case 'waiting':
      return 'Waiting for opponent...';
    default:
      return '';
  }
}

export default function GameUI({ gameState, playerColor, gameOver, opponentDisconnected, onResign }: GameUIProps) {
  const isMyTurn = gameState.turn === playerColor;
  const statusText = getStatusText(gameState, playerColor);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      <div style={{ pointerEvents: 'auto' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Spherical Chess</h2>
        <div style={{
          marginTop: '4px',
          fontSize: '14px',
          color: isMyTurn ? '#7bc96f' : '#ccc',
          fontWeight: isMyTurn ? 600 : 400,
        }}>
          {statusText}
        </div>
        {opponentDisconnected && (
          <div style={{ color: '#e94560', fontSize: '13px', marginTop: '4px' }}>
            Opponent disconnected
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        pointerEvents: 'auto',
      }}>
        <div style={{
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          background: playerColor === 'white' ? '#f0d9b5' : '#b58863',
          color: playerColor === 'white' ? '#333' : '#fff',
        }}>
          Playing as {playerColor}
        </div>

        {!gameOver && (
          <button
            onClick={onResign}
            style={{
              padding: '6px 16px',
              background: '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Resign
          </button>
        )}
      </div>
    </div>
  );
}

export function MoveHistory({ moves }: { moves: { notation?: string }[] }) {
  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 60,
      bottom: 0,
      width: '200px',
      background: 'rgba(0,0,0,0.5)',
      overflowY: 'auto',
      padding: '12px',
      zIndex: 100,
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#aaa' }}>Moves</h3>
      <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
        {moves.map((move, i) => (
          <span key={i} style={{ marginRight: '8px' }}>
            {i % 2 === 0 && <span style={{ color: '#666' }}>{Math.floor(i / 2) + 1}. </span>}
            {move.notation || '...'}
            {' '}
          </span>
        ))}
      </div>
    </div>
  );
}
