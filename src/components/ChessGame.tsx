import { useState, useCallback, useEffect } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

type GameStatus = 'playing' | 'checkmate' | 'draw' | 'stalemate';

interface GameResult {
  status: GameStatus;
  winner?: 'white' | 'black' | 'draw';
  timestamp: Date;
  moves: number;
}

const DIFFICULTY_LEVELS = {
  easy: { name: 'Легко', depth: 1 },
  medium: { name: 'Средне', depth: 2 },
  hard: { name: 'Сложно', depth: 3 },
  expert: { name: 'Эксперт', depth: 4 }
};

export default function ChessGame() {
  const [game, setGame] = useState(new Chess());
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_LEVELS>('medium');
  const [thinking, setThinking] = useState(false);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  const evaluateBoard = (chess: Chess): number => {
    const pieceValues: Record<PieceSymbol, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0
    };

    let score = 0;
    const board = chess.board();

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece) {
          const value = pieceValues[piece.type];
          score += piece.color === 'w' ? -value : value;
        }
      }
    }

    return score;
  };

  const minimax = (
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): number => {
    if (depth === 0 || chess.isGameOver()) {
      return evaluateBoard(chess);
    }

    const moves = chess.moves({ verbose: true });

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = minimax(chess, depth - 1, alpha, beta, false);
        chess.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = minimax(chess, depth - 1, alpha, beta, true);
        chess.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  };

  const getBestMove = (chess: Chess, depth: number) => {
    const moves = chess.moves({ verbose: true });
    let bestMove = moves[0];
    let bestValue = -Infinity;

    for (const move of moves) {
      chess.move(move);
      const boardValue = minimax(chess, depth - 1, -Infinity, Infinity, false);
      chess.undo();

      if (boardValue > bestValue) {
        bestValue = boardValue;
        bestMove = move;
      }
    }

    return bestMove;
  };

  const makeComputerMove = useCallback(() => {
    if (game.isGameOver() || game.turn() !== 'b') return;

    setThinking(true);

    setTimeout(() => {
      const gameCopy = new Chess(game.fen());
      const bestMove = getBestMove(gameCopy, DIFFICULTY_LEVELS[difficulty].depth);
      
      if (bestMove) {
        const newGame = new Chess(game.fen());
        newGame.move(bestMove);
        setGame(newGame);
        setMoveHistory(prev => [...prev, bestMove.san]);
        checkGameStatus(newGame);
      }
      
      setThinking(false);
    }, 300);
  }, [game, difficulty]);

  useEffect(() => {
    if (game.turn() === 'b' && gameStatus === 'playing') {
      makeComputerMove();
    }
  }, [game, gameStatus, makeComputerMove]);

  const checkGameStatus = (chess: Chess) => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'black' : 'white';
      setGameStatus('checkmate');
      addGameResult('checkmate', winner, chess.history().length);
    } else if (chess.isDraw()) {
      setGameStatus('draw');
      addGameResult('draw', 'draw', chess.history().length);
    } else if (chess.isStalemate()) {
      setGameStatus('stalemate');
      addGameResult('stalemate', 'draw', chess.history().length);
    }
  };

  const addGameResult = (status: GameStatus, winner: 'white' | 'black' | 'draw', moves: number) => {
    const result: GameResult = {
      status,
      winner,
      timestamp: new Date(),
      moves
    };
    setGameResults(prev => [result, ...prev].slice(0, 10));
  };

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (gameStatus !== 'playing' || thinking || game.turn() !== 'w') {
      return false;
    }

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move) {
        setGame(gameCopy);
        setMoveHistory(prev => [...prev, move.san]);
        setSelectedSquare(null);
        checkGameStatus(gameCopy);
        return true;
      }
    } catch (error) {
      return false;
    }

    return false;
  };

  const resetGame = () => {
    setGame(new Chess());
    setGameStatus('playing');
    setMoveHistory([]);
    setSelectedSquare(null);
  };

  const getStatusMessage = () => {
    if (thinking) return '🤔 Компьютер думает...';
    if (gameStatus === 'checkmate') {
      return game.turn() === 'w' 
        ? '😢 Вы проиграли! Шах и мат!' 
        : '🎉 Вы победили! Шах и мат!';
    }
    if (gameStatus === 'draw') return '🤝 Ничья!';
    if (gameStatus === 'stalemate') return '🤝 Пат! Ничья!';
    if (game.inCheck()) {
      return game.turn() === 'w' ? '⚠️ Вам шах!' : '⚠️ Компьютеру шах!';
    }
    return game.turn() === 'w' ? '♟️ Ваш ход (белые)' : '🤖 Ход компьютера (черные)';
  };

  const wins = gameResults.filter(r => r.winner === 'white').length;
  const losses = gameResults.filter(r => r.winner === 'black').length;
  const draws = gameResults.filter(r => r.winner === 'draw').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card className="p-6 border-2 border-[#E5E7EB]">
        <div className="flex items-center gap-3 mb-6">
          <Icon name="Crown" className="text-[#F59E0B]" size={32} />
          <h2 className="text-3xl font-bold text-[#1F2937]">Шахматы против компьютера</h2>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-6">
          <div className="space-y-4">
            <Card className={`p-4 text-center border-2 ${
              gameStatus === 'checkmate' && game.turn() === 'b'
                ? 'border-[#10B981] bg-[#D1FAE5]'
                : gameStatus === 'checkmate' && game.turn() === 'w'
                ? 'border-[#EF4444] bg-[#FEE2E2]'
                : 'border-[#E5E7EB]'
            }`}>
              <p className="text-xl font-bold text-[#1F2937]">{getStatusMessage()}</p>
            </Card>

            <div className="max-w-[600px] mx-auto">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardOrientation="white"
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                customDarkSquareStyle={{ backgroundColor: '#779952' }}
                customLightSquareStyle={{ backgroundColor: '#edeed1' }}
                arePiecesDraggable={gameStatus === 'playing' && !thinking && game.turn() === 'w'}
              />
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                onClick={resetGame}
                className="bg-[#10B981] hover:bg-[#059669] text-white font-bold px-6 py-3"
              >
                <Icon name="RotateCcw" size={20} className="mr-2" />
                Новая игра
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[#6B7280] font-medium">Уровень сложности:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {Object.entries(DIFFICULTY_LEVELS).map(([key, value]) => (
                  <Button
                    key={key}
                    onClick={() => setDifficulty(key as keyof typeof DIFFICULTY_LEVELS)}
                    variant={difficulty === key ? 'default' : 'outline'}
                    className={`font-bold ${
                      difficulty === key
                        ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white'
                        : 'border-2 border-[#E5E7EB] hover:border-[#3B82F6]'
                    }`}
                  >
                    {value.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-[300px] space-y-4">
            <Card className="p-4 border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="List" className="text-[#6B7280]" size={20} />
                <h3 className="font-bold text-[#1F2937]">История ходов</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {moveHistory.length === 0 ? (
                  <p className="text-[#6B7280] text-sm text-center py-4">Начните игру</p>
                ) : (
                  moveHistory.map((move, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded ${
                        index % 2 === 0 ? 'bg-[#F9FAFB]' : 'bg-white'
                      }`}
                    >
                      <span className="font-['Roboto_Mono'] text-[#6B7280] text-sm w-8">
                        {Math.floor(index / 2) + 1}.
                      </span>
                      <span className={`font-['Roboto_Mono'] font-bold ${
                        index % 2 === 0 ? 'text-[#1F2937]' : 'text-[#3B82F6]'
                      }`}>
                        {move}
                      </span>
                      <span className="text-xs text-[#6B7280]">
                        {index % 2 === 0 ? '♟️' : '🤖'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-4 border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="BarChart3" className="text-[#10B981]" size={20} />
                <h3 className="font-bold text-[#1F2937]">Статистика</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-[#D1FAE5] rounded">
                  <span className="text-[#059669] font-medium">Победы:</span>
                  <span className="font-['Roboto_Mono'] text-xl font-bold text-[#059669]">
                    {wins}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#FEE2E2] rounded">
                  <span className="text-[#DC2626] font-medium">Поражения:</span>
                  <span className="font-['Roboto_Mono'] text-xl font-bold text-[#DC2626]">
                    {losses}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#E5E7EB] rounded">
                  <span className="text-[#6B7280] font-medium">Ничьи:</span>
                  <span className="font-['Roboto_Mono'] text-xl font-bold text-[#6B7280]">
                    {draws}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-2 border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="flex items-center gap-3 mb-3">
          <Icon name="Info" className="text-[#3B82F6]" size={24} />
          <h3 className="text-lg font-bold text-[#1F2937]">Правила и подсказки</h3>
        </div>
        <div className="text-[#6B7280] space-y-2 text-sm">
          <p>• Вы играете белыми фигурами и всегда ходите первыми</p>
          <p>• Перетаскивайте фигуры мышью для совершения хода</p>
          <p>• Компьютер использует алгоритм Minimax с Alpha-Beta отсечением</p>
          <p>• Уровень сложности можно менять в любой момент игры</p>
          <p>• Пешка автоматически превращается в ферзя при достижении последней горизонтали</p>
        </div>
      </Card>
    </div>
  );
}
