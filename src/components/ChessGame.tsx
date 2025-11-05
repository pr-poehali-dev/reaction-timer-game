import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
type Color = 'w' | 'b';

interface Piece {
  type: PieceType;
  color: Color;
}

interface Position {
  row: number;
  col: number;
}

type Board = (Piece | null)[][];

const PIECE_SYMBOLS: Record<string, string> = {
  'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
  'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚',
};

const initialBoard = (): Board => [
  [
    { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' },
    { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }
  ],
  Array(8).fill(null).map(() => ({ type: 'p', color: 'b' } as Piece)),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null).map(() => ({ type: 'p', color: 'w' } as Piece)),
  [
    { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' },
    { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
  ],
];

const ChessGame = () => {
  const [board, setBoard] = useState<Board>(initialBoard());
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [turn, setTurn] = useState<Color>('w');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'white' | 'black' | 'draw' | null>(null);

  const isValidMove = (from: Position, to: Position, piece: Piece): boolean => {
    if (from.row === to.row && from.col === to.col) return false;

    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === piece.color) return false;

    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    switch (piece.type) {
      case 'p':
        const direction = piece.color === 'w' ? -1 : 1;
        const startRow = piece.color === 'w' ? 6 : 1;
        
        if (from.col === to.col && !targetPiece) {
          if (to.row === from.row + direction) return true;
          if (from.row === startRow && to.row === from.row + 2 * direction && !board[from.row + direction][from.col]) return true;
        }
        
        if (colDiff === 1 && to.row === from.row + direction && targetPiece) return true;
        return false;

      case 'r':
        return (from.row === to.row || from.col === to.col) && isPathClear(from, to);

      case 'n':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

      case 'b':
        return rowDiff === colDiff && isPathClear(from, to);

      case 'q':
        return ((from.row === to.row || from.col === to.col) || (rowDiff === colDiff)) && isPathClear(from, to);

      case 'k':
        return rowDiff <= 1 && colDiff <= 1;

      default:
        return false;
    }
  };

  const isPathClear = (from: Position, to: Position): boolean => {
    const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
    const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;

    let currentRow = from.row + rowStep;
    let currentCol = from.col + colStep;

    while (currentRow !== to.row || currentCol !== to.col) {
      if (board[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  };

  const makeComputerMove = () => {
    const possibleMoves: { from: Position; to: Position }[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.color === 'b') {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              if (isValidMove({ row, col }, { row: toRow, col: toCol }, piece)) {
                possibleMoves.push({ from: { row, col }, to: { row: toRow, col: toCol } });
              }
            }
          }
        }
      }
    }

    if (possibleMoves.length === 0) {
      setGameOver(true);
      setWinner('white');
      return;
    }

    const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    const newBoard = board.map(row => [...row]);
    newBoard[randomMove.to.row][randomMove.to.col] = newBoard[randomMove.from.row][randomMove.from.col];
    newBoard[randomMove.from.row][randomMove.from.col] = null;

    setBoard(newBoard);
    setTurn('w');
  };

  useEffect(() => {
    if (turn === 'b' && !gameOver) {
      const timer = setTimeout(() => makeComputerMove(), 500);
      return () => clearTimeout(timer);
    }
  }, [turn, gameOver]);

  const handleSquareClick = (row: number, col: number) => {
    if (gameOver || turn !== 'w') return;

    const piece = board[row][col];

    if (selectedSquare) {
      const selectedPiece = board[selectedSquare.row][selectedSquare.col];
      
      if (selectedPiece && isValidMove(selectedSquare, { row, col }, selectedPiece)) {
        const newBoard = board.map(row => [...row]);
        newBoard[row][col] = selectedPiece;
        newBoard[selectedSquare.row][selectedSquare.col] = null;

        const capturedKing = board[row][col]?.type === 'k';
        if (capturedKing) {
          setGameOver(true);
          setWinner('white');
        }

        setBoard(newBoard);
        setSelectedSquare(null);
        setTurn('b');
      } else {
        setSelectedSquare(piece && piece.color === 'w' ? { row, col } : null);
      }
    } else {
      if (piece && piece.color === 'w') {
        setSelectedSquare({ row, col });
      }
    }
  };

  const resetGame = () => {
    setBoard(initialBoard());
    setSelectedSquare(null);
    setTurn('w');
    setGameOver(false);
    setWinner(null);
  };

  return (
    <Card className="p-6 border-2 border-[#E5E7EB]">
      <div className="flex items-center gap-3 mb-6">
        <Icon name="Crown" className="text-[#F59E0B]" size={28} />
        <h3 className="text-2xl font-bold text-[#1F2937]">Шахматы</h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="inline-block border-4 border-[#374151] rounded-lg overflow-hidden shadow-xl">
            {board.map((row, rowIndex) => (
              <div key={rowIndex} className="flex">
                {row.map((piece, colIndex) => {
                  const isLight = (rowIndex + colIndex) % 2 === 0;
                  const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                  
                  return (
                    <button
                      key={colIndex}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      disabled={gameOver}
                      className={`
                        w-14 h-14 md:w-16 md:h-16 flex items-center justify-center text-4xl md:text-5xl
                        transition-all duration-200
                        ${isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'}
                        ${isSelected ? 'ring-4 ring-[#10B981] ring-inset' : ''}
                        ${!gameOver && turn === 'w' && piece?.color === 'w' ? 'hover:brightness-110 cursor-pointer' : ''}
                        disabled:cursor-not-allowed
                      `}
                    >
                      {piece && PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:w-80 space-y-4">
          <Card className="p-4 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#6B7280] font-medium">Ход:</span>
              <span className={`text-2xl font-bold ${turn === 'w' ? 'text-[#3B82F6]' : 'text-[#1F2937]'}`}>
                {turn === 'w' ? '♔ Белые (Вы)' : '♚ Чёрные (AI)'}
              </span>
            </div>

            {gameOver && (
              <div className="p-4 bg-white rounded-lg border-2 border-[#10B981] text-center">
                <p className="text-xl font-bold text-[#10B981] mb-2">
                  {winner === 'white' ? '🎉 Вы победили!' : winner === 'black' ? '😔 AI победил' : '🤝 Ничья'}
                </p>
              </div>
            )}
          </Card>

          <Button
            onClick={resetGame}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-lg font-semibold py-6"
          >
            <Icon name="RotateCcw" className="mr-2" size={20} />
            Новая игра
          </Button>

          <Card className="p-4 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
            <h4 className="font-bold text-[#1F2937] mb-2">Правила:</h4>
            <ul className="text-sm text-[#6B7280] space-y-1">
              <li>• Вы играете белыми фигурами</li>
              <li>• Кликните на фигуру, затем на клетку</li>
              <li>• Съешьте короля противника</li>
              <li>• AI делает случайные ходы</li>
            </ul>
          </Card>
        </div>
      </div>
    </Card>
  );
};

export default ChessGame;
