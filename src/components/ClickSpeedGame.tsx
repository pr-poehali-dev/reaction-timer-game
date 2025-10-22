import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

type GameState = 'idle' | 'playing' | 'finished';

interface ClickResult {
  clicks: number;
  cps: number;
  duration: number;
  timestamp: Date;
}

const DURATIONS = [5, 10, 15, 30, 60];

export default function ClickSpeedGame() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [results, setResults] = useState<ClickResult[]>([]);
  const [currentCPS, setCurrentCPS] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const clickCountRef = useRef<number>(0);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 0.01);
        
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed > 0) {
          setCurrentCPS(Math.round((clickCountRef.current / elapsed) * 10) / 10);
        }
      }, 10);
    } else if (timeLeft <= 0 && gameState === 'playing') {
      finishGame();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState, timeLeft]);

  const startGame = () => {
    setGameState('playing');
    setClicks(0);
    setTimeLeft(selectedDuration);
    setCurrentCPS(0);
    clickCountRef.current = 0;
    startTimeRef.current = Date.now();
  };

  const handleClick = () => {
    if (gameState === 'playing') {
      setClicks(prev => prev + 1);
      clickCountRef.current += 1;
    }
  };

  const finishGame = () => {
    setGameState('finished');
    const finalCPS = Math.round((clicks / selectedDuration) * 10) / 10;
    
    const newResult: ClickResult = {
      clicks,
      cps: finalCPS,
      duration: selectedDuration,
      timestamp: new Date()
    };
    
    setResults(prev => [newResult, ...prev].slice(0, 10));
    setCurrentCPS(finalCPS);
  };

  const resetGame = () => {
    setGameState('idle');
    setClicks(0);
    setTimeLeft(selectedDuration);
    setCurrentCPS(0);
    clickCountRef.current = 0;
  };

  const getButtonColor = () => {
    if (gameState === 'idle') return 'bg-[#10B981] hover:bg-[#059669]';
    if (gameState === 'playing') return 'bg-[#3B82F6] hover:bg-[#2563EB] cursor-pointer active:scale-95';
    return 'bg-[#6B7280] hover:bg-[#4B5563]';
  };

  const getButtonText = () => {
    if (gameState === 'idle') return 'НАЧАТЬ ТЕСТ';
    if (gameState === 'playing') return 'КЛИКАЙ!';
    return 'ТЕСТ ЗАВЕРШЕН';
  };

  const bestResult = results.length > 0 ? Math.max(...results.map(r => r.cps)) : null;
  const avgResult = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.cps, 0) / results.length * 10) / 10
    : null;

  return (
    <div className="space-y-6">
      <Card className="p-8 border-2 border-[#E5E7EB]">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <Icon name="MousePointerClick" className="text-[#10B981]" size={36} />
            <h2 className="text-3xl font-bold text-[#1F2937]">Тест скорости кликов</h2>
          </div>
          <p className="text-[#6B7280] text-lg">Нажимай на кнопку как можно быстрее!</p>

          {gameState === 'idle' && (
            <div className="space-y-4">
              <p className="text-[#6B7280] font-medium">Выбери длительность теста:</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {DURATIONS.map(duration => (
                  <Button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    variant={selectedDuration === duration ? 'default' : 'outline'}
                    className={`px-6 py-3 font-bold ${
                      selectedDuration === duration 
                        ? 'bg-[#10B981] hover:bg-[#059669] text-white' 
                        : 'border-2 border-[#E5E7EB] hover:border-[#10B981]'
                    }`}
                  >
                    {duration} сек
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 py-6">
            <Card className="p-6 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <Icon name="MousePointerClick" className="text-[#10B981]" size={24} />
                <h3 className="text-sm font-medium text-[#6B7280] uppercase">Кликов</h3>
              </div>
              <p className="font-['Roboto_Mono'] text-5xl font-bold text-[#1F2937]">
                {clicks}
              </p>
            </Card>

            <Card className="p-6 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <Icon name="Timer" className="text-[#EF4444]" size={24} />
                <h3 className="text-sm font-medium text-[#6B7280] uppercase">Время</h3>
              </div>
              <p className="font-['Roboto_Mono'] text-5xl font-bold text-[#EF4444]">
                {timeLeft.toFixed(2)}
              </p>
            </Card>

            <Card className="p-6 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2 justify-center">
                <Icon name="Zap" className="text-[#3B82F6]" size={24} />
                <h3 className="text-sm font-medium text-[#6B7280] uppercase">CPS</h3>
              </div>
              <p className="font-['Roboto_Mono'] text-5xl font-bold text-[#3B82F6]">
                {currentCPS.toFixed(1)}
              </p>
            </Card>
          </div>

          <Button
            onClick={gameState === 'idle' ? startGame : gameState === 'playing' ? handleClick : resetGame}
            className={`w-full h-32 text-3xl font-bold transition-all ${getButtonColor()}`}
            disabled={gameState === 'finished'}
          >
            {getButtonText()}
          </Button>

          {gameState === 'finished' && (
            <div className="space-y-4 py-6">
              <Card className="p-6 bg-[#F0FDF4] border-2 border-[#10B981]">
                <h3 className="text-2xl font-bold text-[#1F2937] mb-4">Результат</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#6B7280] text-sm">Всего кликов:</p>
                    <p className="font-['Roboto_Mono'] text-3xl font-bold text-[#1F2937]">{clicks}</p>
                  </div>
                  <div>
                    <p className="text-[#6B7280] text-sm">Кликов в секунду:</p>
                    <p className="font-['Roboto_Mono'] text-3xl font-bold text-[#10B981]">{currentCPS.toFixed(1)} CPS</p>
                  </div>
                </div>
              </Card>
              
              <Button
                onClick={resetGame}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xl py-6"
              >
                ПОПРОБОВАТЬ СНОВА
              </Button>
            </div>
          )}
        </div>
      </Card>

      {results.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-2 border-[#E5E7EB]">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="BarChart3" className="text-[#10B981]" size={28} />
              <h3 className="text-2xl font-bold text-[#1F2937]">Статистика</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg">
                <span className="text-[#6B7280]">Лучший результат:</span>
                <span className="font-['Roboto_Mono'] text-2xl font-bold text-[#10B981]">
                  {bestResult?.toFixed(1)} CPS
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg">
                <span className="text-[#6B7280]">Средний результат:</span>
                <span className="font-['Roboto_Mono'] text-2xl font-bold text-[#1F2937]">
                  {avgResult?.toFixed(1)} CPS
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg">
                <span className="text-[#6B7280]">Попыток:</span>
                <span className="font-['Roboto_Mono'] text-2xl font-bold text-[#1F2937]">
                  {results.length}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-2 border-[#E5E7EB]">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="History" className="text-[#6B7280]" size={28} />
              <h3 className="text-2xl font-bold text-[#1F2937]">История</h3>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg"
                >
                  <div>
                    <p className="font-['Roboto_Mono'] text-lg font-bold text-[#1F2937]">
                      {result.clicks} кликов ({result.duration}с)
                    </p>
                    <p className="text-sm text-[#6B7280]">
                      {result.timestamp.toLocaleTimeString('ru-RU')}
                    </p>
                  </div>
                  <span className="font-['Roboto_Mono'] text-2xl font-bold text-[#3B82F6]">
                    {result.cps.toFixed(1)} CPS
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6 border-2 border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="flex items-center gap-3 mb-3">
          <Icon name="Info" className="text-[#3B82F6]" size={24} />
          <h3 className="text-lg font-bold text-[#1F2937]">Информация</h3>
        </div>
        <div className="text-[#6B7280] space-y-2 text-sm">
          <p>• <strong>CPS</strong> (Clicks Per Second) — количество кликов в секунду</p>
          <p>• Средний результат человека: <strong>5-7 CPS</strong></p>
          <p>• Профессиональные геймеры достигают: <strong>10-15 CPS</strong></p>
          <p>• Мировые рекорды превышают: <strong>20 CPS</strong></p>
        </div>
      </Card>
    </div>
  );
}
