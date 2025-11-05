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

type Difficulty = 'easy' | 'medium' | 'hard';

const ChessGame = () => {
  const [board, setBoard] = useState<Board>(initialBoard());
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [turn, setTurn] = useState<Color>('w');
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'white' | 'black' | 'draw' | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [isInCheck, setIsInCheck] = useState<{ white: boolean; black: boolean }>({ white: false, black: false });

  const isValidMove = (from: Position, to: Position, piece: Piece): boolean => {
    if (!isBasicMove(from, to, piece)) return false;
    
    if (piece.type === 'k') {
      const enemyColor: Color = piece.color === 'w' ? 'b' : 'w';
      const testBoard = board.map(row => [...row]);
      testBoard[to.row][to.col] = piece;
      testBoard[from.row][from.col] = null;
      
      if (isSquareUnderAttack(to, enemyColor, testBoard)) {
        return false;
      }
    }
    
    return !wouldBeInCheck(from, to, piece.color);
  };

  const isPathClear = (from: Position, to: Position, testBoard?: Board): boolean => {
    const currentBoard = testBoard || board;
    const rowStep = to.row > from.row ? 1 : to.row < from.row ? -1 : 0;
    const colStep = to.col > from.col ? 1 : to.col < from.col ? -1 : 0;

    let currentRow = from.row + rowStep;
    let currentCol = from.col + colStep;

    while (currentRow !== to.row || currentCol !== to.col) {
      if (currentBoard[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  };

  const findKing = (color: Color, testBoard?: Board): Position | null => {
    const currentBoard = testBoard || board;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece && piece.type === 'k' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  };

  const isSquareUnderAttack = (pos: Position, byColor: Color, testBoard?: Board): boolean => {
    const currentBoard = testBoard || board;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = currentBoard[row][col];
        if (piece && piece.color === byColor) {
          if (isBasicMove({ row, col }, pos, piece, currentBoard)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isBasicMove = (from: Position, to: Position, piece: Piece, testBoard?: Board): boolean => {
    const currentBoard = testBoard || board;
    if (from.row === to.row && from.col === to.col) return false;

    const targetPiece = currentBoard[to.row][to.col];
    if (targetPiece && targetPiece.color === piece.color) return false;

    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    switch (piece.type) {
      case 'p':
        const direction = piece.color === 'w' ? -1 : 1;
        const startRow = piece.color === 'w' ? 6 : 1;
        
        if (from.col === to.col && !targetPiece) {
          if (to.row === from.row + direction) return true;
          if (from.row === startRow && to.row === from.row + 2 * direction && !currentBoard[from.row + direction][from.col]) return true;
        }
        
        if (colDiff === 1 && to.row === from.row + direction && targetPiece) return true;
        return false;

      case 'r':
        return (from.row === to.row || from.col === to.col) && isPathClear(from, to, testBoard);

      case 'n':
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

      case 'b':
        return rowDiff === colDiff && isPathClear(from, to, testBoard);

      case 'q':
        return ((from.row === to.row || from.col === to.col) || (rowDiff === colDiff)) && isPathClear(from, to, testBoard);

      case 'k':
        return rowDiff <= 1 && colDiff <= 1;

      default:
        return false;
    }
  };

  const wouldBeInCheck = (from: Position, to: Position, color: Color): boolean => {
    const testBoard = board.map(row => [...row]);
    testBoard[to.row][to.col] = testBoard[from.row][from.col];
    testBoard[from.row][from.col] = null;

    const kingPos = testBoard[to.row][to.col]?.type === 'k' 
      ? to 
      : findKing(color, testBoard);
    
    if (!kingPos) return false;

    const enemyColor: Color = color === 'w' ? 'b' : 'w';
    return isSquareUnderAttack(kingPos, enemyColor, testBoard);
  };

  const evaluateMove = (move: { from: Position; to: Position }): number => {
    const targetPiece = board[move.to.row][move.to.col];
    const pieceValues: Record<PieceType, number> = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 100
    };
    
    let score = 0;
    if (targetPiece) {
      score += pieceValues[targetPiece.type];
    }
    
    const centerBonus = (4 - Math.abs(3.5 - move.to.row)) + (4 - Math.abs(3.5 - move.to.col));
    score += centerBonus * 0.1;
    
    return score;
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

    let selectedMove;
    
    if (difficulty === 'easy') {
      selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    } else if (difficulty === 'medium') {
      const topMoves = possibleMoves
        .map(move => ({ move, score: evaluateMove(move) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.ceil(possibleMoves.length * 0.3));
      selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)].move;
    } else {
      selectedMove = possibleMoves
        .map(move => ({ move, score: evaluateMove(move) }))
        .sort((a, b) => b.score - a.score)[0].move;
    }

    const newBoard = board.map(row => [...row]);
    newBoard[selectedMove.to.row][selectedMove.to.col] = newBoard[selectedMove.from.row][selectedMove.from.col];
    newBoard[selectedMove.from.row][selectedMove.from.col] = null;

    setBoard(newBoard);
    checkForCheck(newBoard);
    setTurn('w');
  };

  const checkForCheck = (testBoard: Board) => {
    const whiteKingPos = findKing('w', testBoard);
    const blackKingPos = findKing('b', testBoard);
    
    setIsInCheck({
      white: whiteKingPos ? isSquareUnderAttack(whiteKingPos, 'b', testBoard) : false,
      black: blackKingPos ? isSquareUnderAttack(blackKingPos, 'w', testBoard) : false
    });
  };

  useEffect(() => {
    if (turn === 'b' && !gameOver) {
      const timer = setTimeout(() => makeComputerMove(), 500);
      return () => clearTimeout(timer);
    }
  }, [turn, gameOver]);

  const calculateValidMoves = (pos: Position): Position[] => {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];
    
    const moves: Position[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (isValidMove(pos, { row, col }, piece)) {
          moves.push({ row, col });
        }
      }
    }
    return moves;
  };

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
        checkForCheck(newBoard);
        setSelectedSquare(null);
        setValidMoves([]);
        setTurn('b');
      } else {
        if (piece && piece.color === 'w') {
          setSelectedSquare({ row, col });
          setValidMoves(calculateValidMoves({ row, col }));
        } else {
          setSelectedSquare(null);
          setValidMoves([]);
        }
      }
    } else {
      if (piece && piece.color === 'w') {
        setSelectedSquare({ row, col });
        setValidMoves(calculateValidMoves({ row, col }));
      }
    }
  };

  const resetGame = () => {
    setBoard(initialBoard());
    setSelectedSquare(null);
    setValidMoves([]);
    setTurn('w');
    setGameOver(false);
    setWinner(null);
    setIsInCheck({ white: false, black: false });
  };

  useEffect(() => {
    checkForCheck(board);
  }, [board]);

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
                  const isValidMoveSquare = validMoves.some(move => move.row === rowIndex && move.col === colIndex);
                  const isAttackSquare = isValidMoveSquare && board[rowIndex][colIndex] !== null;
                  
                  return (
                    <button
                      key={colIndex}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      disabled={gameOver}
                      className={`
                        w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl relative
                        transition-all duration-200
                        ${isLight ? 'bg-[#F0D9B5]' : 'bg-[#B58863]'}
                        ${isSelected ? 'ring-4 ring-[#10B981] ring-inset' : ''}
                        ${!gameOver && turn === 'w' && piece?.color === 'w' ? 'hover:brightness-110 cursor-pointer' : ''}
                        disabled:cursor-not-allowed
                      `}
                    >
                      {piece && PIECE_SYMBOLS[`${piece.color}${piece.type}`]}
                      {isValidMoveSquare && !isAttackSquare && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-4 h-4 bg-[#10B981] rounded-full opacity-60"></div>
                        </div>
                      )}
                      {isAttackSquare && (
                        <div className="absolute inset-0 ring-4 ring-[#EF4444] ring-inset rounded-sm"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:w-80 space-y-4">
          <Card className="p-4 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#6B7280] mb-3">Сложность AI:</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setDifficulty('easy')}
                  className={`flex-1 py-3 text-base font-semibold ${difficulty === 'easy' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#1F2937]'}`}
                >
                  Легко
                </Button>
                <Button
                  onClick={() => setDifficulty('medium')}
                  className={`flex-1 py-3 text-base font-semibold ${difficulty === 'medium' ? 'bg-[#F59E0B] hover:bg-[#D97706]' : 'bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#1F2937]'}`}
                >
                  Средне
                </Button>
                <Button
                  onClick={() => setDifficulty('hard')}
                  className={`flex-1 py-3 text-base font-semibold ${difficulty === 'hard' ? 'bg-[#EF4444] hover:bg-[#DC2626]' : 'bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#1F2937]'}`}
                >
                  Сложно
                </Button>
              </div>
            </div>
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
            
            {!gameOver && (isInCheck.white || isInCheck.black) && (
              <div className="p-4 bg-[#FEE2E2] rounded-lg border-2 border-[#EF4444] text-center">
                <p className="text-lg font-bold text-[#991B1B]">
                  ⚠️ ШАХ {isInCheck.white ? 'белым!' : 'чёрным!'}
                </p>
              </div>
            )}
          </Card>

          <Button
            onClick={resetGame}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-base sm:text-lg font-semibold py-4 sm:py-6"
          >
            <Icon name="RotateCcw" className="mr-2" size={20} />
            Новая игра
          </Button>

          <Card className="p-4 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
            <h4 className="font-bold text-[#1F2937] mb-2">Правила:</h4>
            <ul className="text-sm text-[#6B7280] space-y-1">
              <li>• Вы играете белыми фигурами</li>
              <li>• Кликните на фигуру, затем на клетку</li>
              <li>• 🟢 Зелёные точки — возможные ходы</li>
              <li>• 🔴 Красная рамка — можно съесть</li>
              <li>• Съешьте короля противника</li>
            </ul>
          </Card>
        </div>
      </div>
    </Card>
  );
};

export default ChessGame;