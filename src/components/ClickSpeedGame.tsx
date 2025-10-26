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

interface AchievementMessage {
  text: string;
  image: string;
}

interface LeaderboardEntry {
  player_name: string;
  clicks: number;
  cps: number;
  created_at: string;
}

const DURATIONS = [5, 10, 15, 30, 60];
const GOOD_IMAGE = 'https://cdn.poehali.dev/projects/2abab238-5391-40ae-ab82-56d894a10964/files/c243b697-0530-4897-a4ab-193a0c154e79.jpg';
const MUSCLE_IMAGE = 'https://cdn.poehali.dev/projects/2abab238-5391-40ae-ab82-56d894a10964/files/1e92adba-5c64-444f-a0e1-7b69470846f4.jpg';
const BITE_87_IMAGE = 'https://cdn.poehali.dev/files/e58cd18a-3f6e-4773-88fb-dd5e9ad031af.jpg';
const SAVE_CLICK_URL = 'https://functions.poehali.dev/d2d66c13-c48a-48c4-936f-064e986c9d93';
const GET_CLICK_LEADERBOARD_URL = 'https://functions.poehali.dev/528579c6-94bd-4ddb-af79-91ed85bdffcc';

interface ClickSpeedGameProps {
  showStatsOnly?: boolean;
}

export default function ClickSpeedGame({ showStatsOnly = false }: ClickSpeedGameProps) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [results, setResults] = useState<ClickResult[]>([]);
  const [currentCPS, setCurrentCPS] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievement, setAchievement] = useState<AchievementMessage | null>(null);
  const [playerName, setPlayerName] = useState('Игрок');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const clickCountRef = useRef<number>(0);

  const saveResult = async (totalClicks: number, finalCPS: number, duration: number) => {
    try {
      await fetch(SAVE_CLICK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_name: playerName,
          clicks: totalClicks,
          cps: finalCPS,
          duration: duration
        })
      });
    } catch (error) {
      console.error('Failed to save click result:', error);
    }
  };

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
    if (!playerName.trim() || playerName.trim().toLowerCase() === 'игрок') {
      alert('Введите своё имя, чтобы начать игру! 😉');
      return;
    }
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
    
    checkAchievements(clicks, selectedDuration);
    
    const newResult: ClickResult = {
      clicks,
      cps: finalCPS,
      duration: selectedDuration,
      timestamp: new Date()
    };
    
    setResults(prev => [newResult, ...prev].slice(0, 10));
    setCurrentCPS(finalCPS);
    saveResult(clicks, finalCPS, selectedDuration);
  };

  const checkAchievements = (totalClicks: number, duration: number) => {
    if (totalClicks === 87) {
      setAchievement({ text: 'Was That The Bite Of 87?!?!', image: BITE_87_IMAGE });
      setShowAchievement(true);
    } else if (duration === 10 && totalClicks >= 150) {
      setAchievement({ text: 'НАКАЧАННЫЕ ПАЛЬЦЫ! 💪', image: MUSCLE_IMAGE });
      setShowAchievement(true);
    } else if (duration === 10 && totalClicks >= 100) {
      setAchievement({ text: 'ХОРОШО! 👍', image: GOOD_IMAGE });
      setShowAchievement(true);
    } else if (duration === 5 && totalClicks >= 30) {
      setAchievement({ text: '😲 😲 😲 НЕВЕРОЯТНО!', image: GOOD_IMAGE });
      setShowAchievement(true);
    }
  };

  const skipAchievement = () => {
    setShowAchievement(false);
    setAchievement(null);
  };

  const resetGame = () => {
    setGameState('idle');
    setClicks(0);
    setTimeLeft(selectedDuration);
    setCurrentCPS(0);
    clickCountRef.current = 0;
    setShowAchievement(false);
    setAchievement(null);
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

  if (showStatsOnly) {
    return (
      <div className="space-y-6">
        {results.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="BarChart3" className="text-[#10B981]" size={28} />
                <h3 className="text-2xl font-bold text-[#1F2937]">Статистика кликов</h3>
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
      </div>
    );
  }

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
              <Card className="p-4 bg-[#F9FAFB] border-2 border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-3">
                  <Icon name="User" className="text-[#10B981]" size={20} />
                  <h3 className="text-sm font-medium text-[#6B7280] uppercase">Имя игрока</h3>
                </div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg text-lg border-2 ${
                    (!playerName.trim() || playerName.trim().toLowerCase() === 'игрок')
                      ? 'border-[#EF4444]'
                      : 'border-[#10B981]'
                  }`}
                  placeholder="Введите ваше имя (не 'Игрок')"
                />
                {(!playerName.trim() || playerName.trim().toLowerCase() === 'игрок') && (
                  <p className="text-[#EF4444] text-sm mt-2 font-medium">
                    ⚠️ Введите уникальное имя для начала игры
                  </p>
                )}
              </Card>
              
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

          {showAchievement && achievement && (
            <Card className="p-8 bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] border-4 border-[#F59E0B]">
              <div className="text-center space-y-4">
                <img 
                  src={achievement.image} 
                  alt="Achievement" 
                  className="w-64 h-64 mx-auto rounded-lg object-cover"
                />
                <h2 className="text-4xl font-bold text-[#1F2937]">{achievement.text}</h2>
                <Button
                  onClick={skipAchievement}
                  className="bg-[#1F2937] hover:bg-[#374151] text-white font-bold text-lg px-8 py-4"
                >
                  Продолжить →
                </Button>
              </div>
            </Card>
          )}

          {gameState === 'finished' && !showAchievement && (
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

      <Card className="p-6 border-2 border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon name="Trophy" className="text-[#F59E0B]" size={28} />
            <h3 className="text-2xl font-bold text-[#1F2937]">Таблица лидеров</h3>
          </div>
          <Button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
          >
            {showLeaderboard ? 'Скрыть' : 'Показать'}
          </Button>
        </div>

        {showLeaderboard && (
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-[#6B7280] text-center py-8">Пока нет результатов</p>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index === 0
                      ? 'bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] border-2 border-[#F59E0B]'
                      : index === 1
                      ? 'bg-gradient-to-r from-[#D1D5DB] to-[#9CA3AF] border-2 border-[#9CA3AF]'
                      : index === 2
                      ? 'bg-gradient-to-r from-[#FCA5A5] to-[#EF4444] border-2 border-[#EF4444]'
                      : 'bg-[#F9FAFB]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-['Roboto_Mono'] text-3xl font-bold ${
                        index < 3 ? 'text-white' : 'text-[#6B7280]'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <div>
                      <p className={`font-bold text-lg ${index < 3 ? 'text-white' : 'text-[#1F2937]'}`}>
                        {entry.player_name}
                      </p>
                      <p className={`text-sm ${index < 3 ? 'text-white/80' : 'text-[#6B7280]'}`}>
                        {entry.clicks} кликов
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-['Roboto_Mono'] text-3xl font-bold ${
                      index < 3 ? 'text-white' : 'text-[#3B82F6]'
                    }`}
                  >
                    {entry.cps.toFixed(1)} CPS
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

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