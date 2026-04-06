// ============================================================
// Spherical Chess - Board Model & Coordinate Wrapping
// ============================================================
//
// The board is a standard 8x8 grid mapped onto a sphere:
//
// HORIZONTAL WRAPPING (Equator):
//   Files a-h wrap around: moving right from h returns to a,
//   moving left from a returns to h. (Like a cylinder.)
//
// VERTICAL WRAPPING (Poles):
//   Moving "off the top" of rank 8 wraps to rank 8 but shifted
//   4 files: a8↔e8, b8↔f8, c8↔g8, d8↔h8. Direction reverses.
//   Same for rank 1: a1↔e1, b1↔f1, c1↔g1, d1↔h1.
//
//   Conceptually, the North Pole sits between rank 8 squares,
//   and the South Pole sits between rank 1 squares.
//   Crossing a pole flips your file by 4 and reverses your
//   rank direction.
// ============================================================

import { Piece, PieceType, Color, Position, GameState, GameStatus } from './types.js';

export function createEmptyBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = [];
  for (let file = 0; file < 8; file++) {
    board[file] = [];
    for (let rank = 0; rank < 8; rank++) {
      board[file][rank] = null;
    }
  }
  return board;
}

export function createInitialBoard(): (Piece | null)[][] {
  const board = createEmptyBoard();

  const backRank: PieceType[] = [
    PieceType.Rook, PieceType.Knight, PieceType.Bishop, PieceType.Queen,
    PieceType.King, PieceType.Bishop, PieceType.Knight, PieceType.Rook,
  ];

  for (let file = 0; file < 8; file++) {
    // White back rank (rank 0 = rank 1)
    board[file][0] = { type: backRank[file], color: Color.White, hasMoved: false };
    // White pawns (rank 1 = rank 2)
    board[file][1] = { type: PieceType.Pawn, color: Color.White, hasMoved: false };
    // Black pawns (rank 6 = rank 7)
    board[file][6] = { type: PieceType.Pawn, color: Color.Black, hasMoved: false };
    // Black back rank (rank 7 = rank 8)
    board[file][7] = { type: backRank[file], color: Color.Black, hasMoved: false };
  }

  return board;
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    turn: Color.White,
    moveHistory: [],
    halfMoveClock: 0,
    fullMoveNumber: 1,
    enPassantTarget: null,
    castlingRights: {
      [Color.White]: { kingSide: true, queenSide: true },
      [Color.Black]: { kingSide: true, queenSide: true },
    },
    status: GameStatus.Active,
    winner: null,
  };
}

/**
 * Wraps a file index around the cylinder (0-7).
 */
export function wrapFile(file: number): number {
  return ((file % 8) + 8) % 8;
}

/**
 * Wraps a position through the poles of the sphere.
 *
 * If rank goes above 7 (off the north pole) or below 0 (off the south pole),
 * the file shifts by 4 and the rank bounces back.
 *
 * Returns null if the position bounces back and re-crosses (invalid).
 */
export function wrapPosition(file: number, rank: number): Position | null {
  let wrappedFile = wrapFile(file);
  let wrappedRank = rank;

  if (wrappedRank > 7) {
    // Cross north pole: rank bounces back, file shifts by 4
    wrappedRank = 14 - wrappedRank; // 8->6, 9->5, etc. Actually: 7 + (7 - (rank - 1)) ... let me recalculate
    // Going 1 past rank 7 means rank 8 -> bounces to rank 7, shifted
    // Going 2 past rank 7 means rank 9 -> bounces to rank 6, shifted
    // Formula: new_rank = 7 - (rank - 8) = 15 - rank... no
    // If you step off rank 7 (index) by 1, you land on rank 7 with file+4
    // Actually for sliding pieces, stepping from rank 7 upward:
    // One step past rank 7: lands on rank 7, file+4 (you "arrived" at the pole neighbor)
    // Two steps past rank 7: lands on rank 6, file+4 (continuing south on the other side)
    // rank = 8: new_rank = 7, rank = 9: new_rank = 6, rank = 10: new_rank = 5
    // Formula: new_rank = 15 - rank
    wrappedRank = 15 - rank;
    wrappedFile = wrapFile(wrappedFile + 4);
  } else if (wrappedRank < 0) {
    // Cross south pole: rank bounces back, file shifts by 4
    // rank = -1: new_rank = 0, rank = -2: new_rank = 1
    // Formula: new_rank = -1 - rank
    wrappedRank = -1 - rank;
    wrappedFile = wrapFile(wrappedFile + 4);
  }

  // After one pole crossing, if still out of bounds, it's invalid
  if (wrappedRank < 0 || wrappedRank > 7) {
    return null;
  }

  return { file: wrappedFile, rank: wrappedRank };
}

/**
 * Gets the piece at a position on the board.
 */
export function getPiece(board: (Piece | null)[][], pos: Position): Piece | null {
  if (pos.file < 0 || pos.file > 7 || pos.rank < 0 || pos.rank > 7) return null;
  return board[pos.file][pos.rank];
}

/**
 * Returns a deep copy of the board.
 */
export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(file => file.map(piece => piece ? { ...piece } : null));
}

/**
 * Returns a deep copy of the game state.
 */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    moveHistory: [...state.moveHistory],
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    castlingRights: {
      [Color.White]: { ...state.castlingRights[Color.White] },
      [Color.Black]: { ...state.castlingRights[Color.Black] },
    },
  };
}

export function posToString(pos: Position): string {
  return `${String.fromCharCode(97 + pos.file)}${pos.rank + 1}`;
}

export function posFromString(str: string): Position {
  return {
    file: str.charCodeAt(0) - 97,
    rank: parseInt(str[1]) - 1,
  };
}

export function posEqual(a: Position, b: Position): boolean {
  return a.file === b.file && a.rank === b.rank;
}
