# Spherical Chess Rules

## Overview

Spherical Chess is played on a standard 8x8 chessboard that is mapped onto the surface of a sphere. All standard chess rules apply, with modifications for how the board wraps around.

## Board Topology

The key difference from standard chess is how the edges of the board connect:

### Horizontal Wrapping (Files)

The a-file and h-file are connected, forming a cylinder:
- Moving right from h reaches a
- Moving left from a reaches h
- This applies to all piece movements

```
... f  g  h | a  b  c ...
           ←→
    The board wraps horizontally
```

### Vertical Wrapping (Poles)

The top and bottom edges connect through "poles," but with a twist:

**North Pole (above rank 8):**
Going off the top of the board brings you back onto rank 8, but shifted 4 files:
- a8 ↔ e8 (through the pole)
- b8 ↔ f8
- c8 ↔ g8
- d8 ↔ h8

**South Pole (below rank 1):**
Same rule applies at the bottom:
- a1 ↔ e1 (through the pole)
- b1 ↔ f1
- c1 ↔ g1
- d1 ↔ h1

When crossing a pole, your direction of travel reverses (you were going north, now you're going south on the other side).

```
     North Pole
  a8  b8  c8  d8
  ↕   ↕   ↕   ↕    (connected through pole)
  e8  f8  g8  h8

  ... normal board ...

  a1  b1  c1  d1
  ↕   ↕   ↕   ↕    (connected through pole)
  e1  f1  g1  h1
     South Pole
```

## Piece Movement

All pieces move according to standard chess rules, but their paths follow the spherical wrapping:

### Rook
- Moves along ranks and files as normal
- Can travel through the file wrap (a↔h)
- Can travel through the poles (continuing on the shifted file on the other side)
- Example: A rook on a8 moving north crosses the pole and continues south on e8, e7, e6...

### Bishop
- Moves diagonally as normal
- Diagonals wrap around files and through poles
- Example: A bishop moving northeast from g7 goes to h8, then crosses the pole to continue on d7 (file h+4=d, rank bounces from 9→7, direction reverses to southeast... actually going d7)

### Queen
- Combines rook and bishop movement with wrapping

### Knight
- Makes its standard L-shaped jump
- The destination square wraps through files and poles
- Example: A knight on g7 jumping to (g+1, 7+2) = h9 → wraps to d7 through the north pole

### King
- Moves one square in any direction with wrapping
- Castling follows standard rules (only along the back rank, does not wrap through poles)

### Pawn
- Moves forward with wrapping
- Pawns that reach the 8th rank (or 1st rank for black) promote as normal
- Pawns do NOT wrap through the poles (promotion happens at the edge)
- En passant works normally with file wrapping

## Special Rules

### Castling
Standard castling rules apply. Castling only occurs along the back rank and does not involve pole wrapping. The king and rook must not have moved, squares between must be empty, and the king cannot castle through check.

### En Passant
Works as in standard chess, with file wrapping applied. If a pawn on the h-file advances two squares, a pawn on the a-file can capture en passant (and vice versa).

### Promotion
Standard promotion rules. A pawn reaching the opponent's back rank promotes.

### Check and Checkmate
Standard rules, but pieces can deliver check through the wrapped edges and poles.

### Draw Conditions
- Stalemate (no legal moves, not in check)
- 50-move rule (50 moves without a pawn move or capture)
- Threefold repetition (not currently implemented)

## Strategic Implications

1. **No safe edges**: In standard chess, pieces on the edge have fewer attacking squares. On a sphere, there are no edges - every square has the full complement of neighbors.

2. **Bishops are stronger**: Bishops can access all squares of their color through pole wrapping, making them potentially more powerful than in standard chess.

3. **Rook files connect**: A rook controls not just its file, but the file wraps around, effectively creating a circular file.

4. **Back rank is vulnerable from behind**: The poles connect the back ranks, so pieces can attack from "behind" through the poles.

5. **Knights have full mobility everywhere**: No corner or edge reduction in knight moves.
