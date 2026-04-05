import React, { useState } from 'react';

interface LobbyProps {
  connected: boolean;
  onJoinQueue: (name: string) => void;
  onCreatePrivate: (name: string) => void;
  onJoinPrivate: (roomId: string, name: string) => void;
  onPlayLocal: () => void;
  error: string | null;
  onClearError: () => void;
}

export default function Lobby({
  connected,
  onJoinQueue,
  onCreatePrivate,
  onJoinPrivate,
  onPlayLocal,
  error,
  onClearError,
}: LobbyProps) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState<'quick' | 'private' | 'local'>('quick');
  const [inQueue, setInQueue] = useState(false);

  const playerName = name.trim() || 'Player';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      padding: '20px',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          fontWeight: 800,
          background: 'linear-gradient(90deg, #e94560, #f7c948)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
        }}>
          Spherical Chess
        </h1>
        <p style={{ color: '#888', marginTop: '8px', fontSize: '16px' }}>
          Chess on a sphere - where every edge connects
        </p>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '420px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Connection status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          color: connected ? '#7bc96f' : '#e94560',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connected ? '#7bc96f' : '#e94560',
          }} />
          {connected ? 'Connected to server' : 'Connecting...'}
        </div>

        {/* Name input */}
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)',
            color: '#fff',
            fontSize: '15px',
            marginBottom: '16px',
            outline: 'none',
          }}
        />

        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {(['quick', 'private', 'local'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setInQueue(false); }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                background: tab === t ? '#e94560' : 'rgba(255,255,255,0.08)',
                color: tab === t ? '#fff' : '#aaa',
                transition: 'all 0.2s',
              }}
            >
              {t === 'quick' ? 'Quick Match' : t === 'private' ? 'Private' : 'Local'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'quick' && (
          <div>
            {!inQueue ? (
              <button
                onClick={() => { setInQueue(true); onJoinQueue(playerName); }}
                disabled={!connected}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: connected ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 700,
                  background: connected
                    ? 'linear-gradient(90deg, #e94560, #c23152)'
                    : '#555',
                  color: '#fff',
                }}
              >
                Find Opponent
              </button>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{
                  width: '32px', height: '32px', margin: '0 auto 12px',
                  border: '3px solid #e94560', borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <p style={{ color: '#ccc', fontSize: '14px' }}>Searching for opponent...</p>
                <button
                  onClick={() => { setInQueue(false); }}
                  style={{
                    marginTop: '12px', padding: '8px 16px',
                    background: 'transparent', border: '1px solid #666',
                    color: '#aaa', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'private' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => onCreatePrivate(playerName)}
              disabled={!connected}
              style={{
                width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
                cursor: connected ? 'pointer' : 'not-allowed',
                fontSize: '15px', fontWeight: 600,
                background: 'linear-gradient(90deg, #e94560, #c23152)',
                color: '#fff',
              }}
            >
              Create Game
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: '14px', outline: 'none',
                }}
              />
              <button
                onClick={() => onJoinPrivate(roomCode.trim(), playerName)}
                disabled={!connected || !roomCode.trim()}
                style={{
                  padding: '12px 20px', borderRadius: '8px', border: 'none',
                  cursor: connected && roomCode.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px', fontWeight: 600, background: '#0f3460',
                  color: '#fff',
                }}
              >
                Join
              </button>
            </div>
          </div>
        )}

        {tab === 'local' && (
          <button
            onClick={onPlayLocal}
            style={{
              width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '16px', fontWeight: 700,
              background: 'linear-gradient(90deg, #f7c948, #e9a620)',
              color: '#1a1a2e',
            }}
          >
            Play Locally (2 Players)
          </button>
        )}

        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(233,69,96,0.2)', border: '1px solid rgba(233,69,96,0.4)',
            color: '#e94560', fontSize: '13px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {error}
            <button onClick={onClearError} style={{
              background: 'none', border: 'none', color: '#e94560',
              cursor: 'pointer', fontSize: '16px',
            }}>x</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
