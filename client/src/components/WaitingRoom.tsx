import React from 'react';
import type { GameRoom } from 'spherical-chess-shared';

interface WaitingRoomProps {
  room: GameRoom;
}

export default function WaitingRoom({ room }: WaitingRoomProps) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      <h2 style={{ marginBottom: '20px' }}>Waiting for opponent...</h2>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px 40px',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '14px', color: '#aaa', margin: '0 0 8px' }}>Share this room code:</p>
        <p style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '4px',
          color: '#f7c948',
          margin: 0,
          fontFamily: 'monospace',
        }}>
          {room.id}
        </p>
      </div>
      <div style={{
        marginTop: '24px',
        width: '32px',
        height: '32px',
        border: '3px solid #e94560',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
