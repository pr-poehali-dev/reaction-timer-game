import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import ClickSpeedGame from '@/components/ClickSpeedGame';

type GameState = 'waiting' | 'ready' | 'green' | 'clicked' | 'failed' | 'timeout';

interface GameResult {
  time: number;
  timestamp: Date;
}

interface LeaderboardEntry {
  player_name: string;
  reaction_time: number;
  created_at: string;
}

const SAVE_RESULT_URL = 'https://functions.poehali.dev/da504e53-a2a8-40cc-8b6a-7611aebd6031';
const GET_LEADERBOARD_URL = 'https://functions.poehali.dev/4851b3a8-ea61-4542-b21a-3a67a27f31ff';
const FACEPALM_IMAGE = 'https://cdn.poehali.dev/projects/2abab238-5391-40ae-ab82-56d894a10964/files/fec0c034-a3d5-4c8f-a51f-f1c047ac3957.jpg';

export default function ReactionGame() {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [reactionTime, setReactionTime] = useState<number>(0);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<GameResult[]>([]);
  const [playerName, setPlayerName] = useState('Игрок');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState('modes');
  const [timeoutCount, setTimeoutCount] = useState(0);
  const [showSpecialMessage, setShowSpecialMessage] = useState(false);
  const [specialMessageText, setSpecialMessageText] = useState('');
  
  const greenTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const greenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const failTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (running && gameState === 'green') {
      timerRef.current = setInterval(() => {
        setReactionTime(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, gameState]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(GET_LEADERBOARD_URL);
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const saveResult = async (time: number) => {
    try {
      await fetch(SAVE_RESULT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_name: playerName,
          reaction_time: time
        })
      });
      fetchLeaderboard();
    } catch (error) {
      console.error('Failed to save result:', error);
    }
  };

  const handleButtonClick = () => {
    if (gameState === 'waiting') {
      if (!playerName.trim() || playerName.trim().toLowerCase() === 'игрок') {
        alert('Введите своё имя, чтобы начать игру! 😉');
        return;
      }
      setGameState('ready');
      setShowSpecialMessage(false);
      const delay = Math.random() * 4000 + 1000;
      
      greenTimerRef.current = setTimeout(() => {
        setGameState('green');
        setRunning(true);
        startTimeRef.current = Date.now();
        greenTimeRef.current = Date.now();

        failTimerRef.current = setTimeout(() => {
          setGameState('timeout');
          setRunning(false);
          setReactionTime(0);
          setTimeoutCount(prev => prev + 1);
          setShowSpecialMessage(true);
          
          setTimeout(() => {
            setGameState('waiting');
          }, 5000);
        }, 5000);
      }, delay);
    } else if (gameState === 'ready') {
      if (greenTimerRef.current) clearTimeout(greenTimerRef.current);
      setGameState('failed');
      setTimeout(() => {
        setGameState('waiting');
      }, 2000);
    } else if (gameState === 'green') {
      if (failTimerRef.current) clearTimeout(failTimerRef.current);
      const finalTime = Date.now() - startTimeRef.current;
      setReactionTime(finalTime);
      setRunning(false);
      
      if (finalTime <= 30) {
        setSpecialMessageText('⚠️ Подозрительно быстро! Это уже попахивает читами... 🤨');
        setShowSpecialMessage(true);
      } else if (finalTime >= 4900 && finalTime <= 4999) {
        setSpecialMessageText('Близко к поражению... как тебе вообще это удалось? Ты нас испытываешь? Или просто специально пытаешься нарушить правила? 🤨');
        setShowSpecialMessage(true);
      } else {
        setShowSpecialMessage(false);
      }
      
      setGameState('clicked');
      setTimeoutCount(0);
      
      const newResult: GameResult = {
        time: finalTime,
        timestamp: new Date()
      };
      setResults(prev => [newResult, ...prev].slice(0, 10));
      saveResult(finalTime);

      const displayTime = (finalTime <= 30 || (finalTime >= 4900 && finalTime <= 4999)) ? 6000 : 3000;
      setTimeout(() => {
        setGameState('waiting');
        setReactionTime(0);
        setShowSpecialMessage(false);
      }, displayTime);
    } else if (gameState === 'timeout') {
      setShowSpecialMessage(false);
      setGameState('waiting');
    }
  };

  const getButtonColor = () => {
    switch (gameState) {
      case 'waiting':
        return 'bg-[#EF4444] hover:bg-[#DC2626]';
      case 'ready':
        return 'bg-[#EF4444] hover:bg-[#DC2626]';
      case 'green':
        return 'bg-[#10B981] hover:bg-[#059669]';
      case 'clicked':
        return 'bg-[#10B981]';
      case 'failed':
        return 'bg-[#1F2937]';
      case 'timeout':
        return 'bg-[#1F2937]';
      default:
        return 'bg-[#EF4444]';
    }
  };

  const getButtonText = () => {
    switch (gameState) {
      case 'waiting':
        return 'Нажми для старта';
      case 'ready':
        return 'Жди зелёный...';
      case 'green':
        return 'ЖМИ!';
      case 'clicked':
        return `${reactionTime} мс`;
      case 'failed':
        return 'Рано! Попробуй ещё';
      case 'timeout':
        return 'Нажми чтобы продолжить';
      default:
        return 'Нажми для старта';
    }
  };

  const getTimeoutMessage = () => {
    if (timeoutCount === 1) {
      return 'Похоже, наш игрок слепой! 🙈 Возможно, стоит изучить правила снова...';
    } else if (timeoutCount >= 2) {
      return 'Ты кажется необучаемый, или просто издеваешься над сайтом, проверяя какой пойдет сценарий? 🤔';
    }
    return '';
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = ms % 1000;
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const bestTime = results.length > 0 ? Math.min(...results.map(r => r.time)) : null;
  const avgTime = results.length > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.time, 0) / results.length) 
    : null;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-['Roboto']">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-5xl md:text-7xl font-bold text-[#1F2937] tracking-tight">
            REACTION GAME
          </h1>
          <p className="text-[#6B7280] text-lg">Проверь свою скорость реакции</p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="modes">Тест реакции</TabsTrigger>
            <TabsTrigger value="clicks">Скорость кликов</TabsTrigger>
            <TabsTrigger value="leaderboard">Лидеры</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
            <TabsTrigger value="clicks-stats">Результаты кликов</TabsTrigger>
            <TabsTrigger value="rules">Правила</TabsTrigger>
          </TabsList>

          <TabsContent value="modes" className="space-y-6">
            <Card className="p-6 border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-4">
                <Icon name="User" className="text-[#10B981]" size={24} />
                <h3 className="text-sm font-medium text-[#6B7280] uppercase tracking-wide">
                  Имя игрока
                </h3>
              </div>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className={`text-lg ${(!playerName.trim() || playerName.trim().toLowerCase() === 'игрок') ? 'border-2 border-[#EF4444]' : 'border-2 border-[#10B981]'}`}
                placeholder="Введите ваше имя (не 'Игрок')"
              />
              {(!playerName.trim() || playerName.trim().toLowerCase() === 'игрок') && (
                <p className="text-[#EF4444] text-sm mt-2 font-medium">
                  ⚠️ Введите уникальное имя для начала игры
                </p>
              )}
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 border-2 border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name="Zap" className="text-[#10B981]" size={24} />
                  <h3 className="text-sm font-medium text-[#6B7280] uppercase tracking-wide">
                    Текущий результат
                  </h3>
                </div>
                <p className="text-4xl font-bold text-[#1F2937] font-['Roboto_Mono']">
                  {gameState === 'green' && running
                    ? formatTime(reactionTime)
                    : gameState === 'clicked'
                    ? `${reactionTime} мс`
                    : '—'}
                </p>
              </Card>

              <Card className="p-6 border-2 border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name="Trophy" className="text-[#EF4444]" size={24} />
                  <h3 className="text-sm font-medium text-[#6B7280] uppercase tracking-wide">
                    Лучший результат
                  </h3>
                </div>
                <p className="text-4xl font-bold text-[#1F2937] font-['Roboto_Mono']">
                  {bestTime ? `${bestTime} мс` : '—'}
                </p>
              </Card>

              <Card className="p-6 border-2 border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name="Target" className="text-[#6B7280]" size={24} />
                  <h3 className="text-sm font-medium text-[#6B7280] uppercase tracking-wide">
                    Попыток
                  </h3>
                </div>
                <p className="text-4xl font-bold text-[#1F2937] font-['Roboto_Mono']">
                  {results.length}
                </p>
              </Card>
            </div>

            {gameState === 'timeout' && showSpecialMessage && (
              <Card className="p-8 border-4 border-[#EF4444] bg-[#FEF2F2] animate-fade-in">
                <div className="flex flex-col items-center gap-6 text-center">
                  <img 
                    src={FACEPALM_IMAGE} 
                    alt="Facepalm"
                    className="w-64 h-64 object-cover rounded-2xl shadow-lg"
                  />
                  <p className="text-2xl md:text-3xl font-bold text-[#EF4444] leading-relaxed">
                    {getTimeoutMessage()}
                  </p>
                  <Button
                    onClick={() => setActiveTab('rules')}
                    className="bg-[#10B981] hover:bg-[#059669] text-white text-lg px-8 py-6"
                  >
                    Перечитать правила
                  </Button>
                </div>
              </Card>
            )}

            {gameState === 'clicked' && showSpecialMessage && specialMessageText && (
              <Card className="p-8 border-4 border-[#F59E0B] bg-[#FFFBEB] animate-fade-in">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Icon name="Lightbulb" className="text-[#F59E0B]" size={64} />
                  <p className="text-2xl md:text-3xl font-bold text-[#F59E0B] leading-relaxed">
                    {specialMessageText}
                  </p>
                </div>
              </Card>
            )}

            <Card className="p-12 md:p-20 border-2 border-[#E5E7EB] flex items-center justify-center">
              <Button
                onClick={handleButtonClick}
                disabled={(gameState === 'failed' || gameState === 'clicked') && !showSpecialMessage}
                className={`w-full max-w-2xl h-48 md:h-64 text-3xl md:text-5xl font-bold rounded-2xl transition-all duration-300 ${getButtonColor()} text-white shadow-lg hover:shadow-xl disabled:opacity-100`}
              >
                {getButtonText()}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="p-6 border-2 border-[#E5E7EB]">
              <div className="flex items-center gap-3 mb-6">
                <Icon name="Trophy" className="text-[#EF4444]" size={32} />
                <h3 className="text-3xl font-bold text-[#1F2937]">
                  Таблица лидеров (реакция)
                </h3>
              </div>
              
              {leaderboard.length === 0 ? (
                <p className="text-[#6B7280] text-center py-12 text-lg">
                  Пока нет результатов. Стань первым!
                </p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-5 rounded-lg ${
                        index === 0 ? 'bg-[#FEF3C7] border-2 border-[#F59E0B]' :
                        index === 1 ? 'bg-[#E5E7EB] border-2 border-[#9CA3AF]' :
                        index === 2 ? 'bg-[#FED7AA] border-2 border-[#F97316]' :
                        'bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-bold text-[#1F2937] w-12">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-xl text-[#1F2937]">
                            {entry.player_name}
                          </p>
                          <p className="text-sm text-[#6B7280]">
                            {new Date(entry.created_at).toLocaleString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <span className="font-['Roboto_Mono'] text-3xl font-bold text-[#10B981]">
                        {entry.reaction_time} мс
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="clicks" className="space-y-6">
            <ClickSpeedGame />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-4">
                  <Icon name="BarChart3" className="text-[#10B981]" size={28} />
                  <h3 className="text-2xl font-bold text-[#1F2937]">
                    Статистика реакции
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg">
                    <span className="text-[#6B7280]">Всего попыток:</span>
                    <span className="font-['Roboto_Mono'] text-2xl font-bold text-[#1F2937]">
                      {results.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg">
                    <span className="text-[#6B7280]">Лучший результат:</span>
                    <span className="font-['Roboto_Mono'] text-2xl font-bold text-[#10B981]">
                      {bestTime ? `${bestTime} мс` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg">
                    <span className="text-[#6B7280]">Средний результат:</span>
                    <span className="font-['Roboto_Mono'] text-2xl font-bold text-[#1F2937]">
                      {avgTime ? `${avgTime} мс` : '—'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-2 border-[#E5E7EB]">
                <div className="flex items-center gap-3 mb-4">
                  <Icon name="Clock" className="text-[#6B7280]" size={28} />
                  <h3 className="text-2xl font-bold text-[#1F2937]">
                    История результатов
                  </h3>
                </div>
                
                {results.length === 0 ? (
                  <p className="text-[#6B7280] text-center py-12">
                    Сыграй первую игру
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-4 bg-[#F9FAFB] rounded-lg"
                      >
                        <span className="font-['Roboto_Mono'] text-xl font-bold text-[#1F2937]">
                          {result.time} мс
                        </span>
                        <span className="text-sm text-[#6B7280]">
                          {result.timestamp.toLocaleTimeString('ru-RU')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clicks-stats" className="space-y-6">
            <ClickSpeedGame showStatsOnly={true} />
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <Card className="p-8 border-2 border-[#10B981] bg-[#F0FDF4]">
              <div className="flex items-center gap-3 mb-6">
                <Icon name="Info" className="text-[#10B981]" size={32} />
                <h3 className="text-3xl font-bold text-[#1F2937]">
                  Правила игры
                </h3>
              </div>
              <ul className="space-y-4 text-[#374151] text-lg">
                <li className="flex gap-3">
                  <span className="text-[#10B981] text-2xl">1.</span>
                  <span>Нажми на красную кнопку для старта игры</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#10B981] text-2xl">2.</span>
                  <span>Жди, пока кнопка станет зелёной (от 1 до 5 секунд)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#10B981] text-2xl">3.</span>
                  <span>Нажми как можно быстрее, когда увидишь зелёный цвет</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#10B981] text-2xl">4.</span>
                  <span>Если не нажмёшь за 5 секунд после зелёного — проиграл</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#10B981] text-2xl">5.</span>
                  <span>Если нажмёшь раньше времени — начинай сначала</span>
                </li>
              </ul>
            </Card>

            <Card className="p-8 border-2 border-[#E5E7EB]">
              <h3 className="text-2xl font-bold text-[#1F2937] mb-4">
                Уровни реакции
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-[#DCFCE7] rounded-lg border-2 border-[#10B981]">
                  <p className="font-bold text-[#1F2937]">Менее 200 мс — Невероятно!</p>
                  <p className="text-sm text-[#6B7280]">Реакция профессионального геймера</p>
                </div>
                <div className="p-4 bg-[#FEF3C7] rounded-lg border-2 border-[#F59E0B]">
                  <p className="font-bold text-[#1F2937]">200-300 мс — Отлично!</p>
                  <p className="text-sm text-[#6B7280]">Очень быстрая реакция</p>
                </div>
                <div className="p-4 bg-[#E5E7EB] rounded-lg border-2 border-[#9CA3AF]">
                  <p className="font-bold text-[#1F2937]">300-400 мс — Хорошо</p>
                  <p className="text-sm text-[#6B7280]">Средняя реакция</p>
                </div>
                <div className="p-4 bg-[#FEE2E2] rounded-lg border-2 border-[#EF4444]">
                  <p className="font-bold text-[#1F2937]">Более 400 мс — Попробуй ещё</p>
                  <p className="text-sm text-[#6B7280]">Есть куда расти!</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}