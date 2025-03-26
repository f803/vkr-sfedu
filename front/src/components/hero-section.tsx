'use client'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, AlertCircle, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { API_ENDPOINTS } from '@/config/api'

export function HeroSection() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [autoModel, setAutoModel] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null)
  const [isExactTime, setIsExactTime] = useState<boolean>(false)
  const [showMultipleRequestAlert, setShowMultipleRequestAlert] = useState(false)
  const [statusErrorCount, setStatusErrorCount] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showFixedTimer, setShowFixedTimer] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  // Функция для конвертации чисел в текст
  const numberToText = (num: number): string => {
    const numbers: { [key: number]: string } = {
      0: 'ноль',
      1: 'одна',
      2: 'две',
      3: 'три',
      4: 'четыре',
      5: 'пять',
      6: 'шесть',
      7: 'семь',
      8: 'восемь',
      9: 'девять',
      10: 'десять'
    };
    return numbers[num] || num.toString();
  };

  // Функция для форматирования минут
  const formatMinutes = (minutes: number | null): string => {
    if (!minutes) return '';
    if (minutes < 1) return 'Еще чуть-чуть ⏳';
    
    const roundedMinutes = Math.round(minutes);
    const minutesText = numberToText(roundedMinutes);
    
    // Правильное склонение слова "минута"
    let minuteForm = 'минут';
    if (roundedMinutes === 1) {
      minuteForm = 'минута';
    } else if (roundedMinutes >= 2 && roundedMinutes <= 4) {
      minuteForm = 'минуты';
    }
    
    return `${minutesText} ${minuteForm}`;
  };

  // Функция для очистки интервала
  const clearPollingInterval = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  // Функция для запуска опроса статуса
  const startPolling = () => {
    clearPollingInterval();

    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(API_ENDPOINTS.GENERATION_STATUS);
        const data = await response.json();

        if (data.status === 'completed') {
          setIsGenerating(false);
          setProgress(100);
          clearPollingInterval();
          setGeneratedImage(data.result.url || `data:image/png;base64,${data.result.image}`);
          setRemainingMinutes(null);
        } else if (data.status === 'processing') {
          setProgress(data.progress);
          setRemainingMinutes(data.remainingMinutes);
        } else if (data.status === 'error') {
          setError(data.message);
          setIsGenerating(false);
          clearPollingInterval();
          setRemainingMinutes(null);
        }
      } catch (error) {
        console.error('Ошибка при получении статуса:', error);
        setError('Ошибка при получении статуса генерации');
        setIsGenerating(false);
        clearPollingInterval();
        setRemainingMinutes(null);
      }
    }, 1000);
  };

  // Функция для генерации изображения
  const handleGenerate = async () => {
    if (isGenerating) return;
    
    setError(null);
    setIsGenerating(true);
    setProgress(0);
    
    try {
      const response = await fetch(API_ENDPOINTS.GENERATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'processing') {
        setRemainingMinutes(data.remainingMinutes);
        startPolling();
      } else {
        setError(data.message);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Ошибка при генерации:', error);
      setError('Произошла ошибка при генерации изображения');
      setIsGenerating(false);
    }
  };

  // Восстанавливаем последнее изображение при загрузке
  useEffect(() => {
    const fetchLastImage = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.LAST_IMAGE);
        if (!response.ok) {
          throw new Error('Ошибка при получении последнего изображения');
        }
        
        const data = await response.json();
        
        if (data.status === 'success' && data.image) {
          setGeneratedImage(data.image.url);
          setPrompt(data.image.prompt);
        }
      } catch (error) {
        console.error('Ошибка при получении последнего изображения:', error);
      }
    };

    // Проверяем статус генерации
    const checkInitialStatus = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.GENERATION_STATUS);
        const data = await response.json();
        
        if (data.status === 'processing') {
          setIsGenerating(true);
          setProgress(data.progress);
          setRemainingMinutes(data.remainingMinutes);
          startPolling();
        }
      } catch (error) {
        console.error('Ошибка при проверке начального статуса:', error);
      }
    };

    fetchLastImage();
    checkInitialStatus();

    return () => {
      clearPollingInterval();
    };
  }, []);

  // Добавляем обработчик прокрутки
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom
        setShowFixedTimer(heroBottom < 0)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <div ref={heroRef} className="min-h-screen flex items-center justify-center py-16">
        <div className="container mx-auto px-4">
          {showMultipleRequestAlert && (
            <div className="fixed top-20 right-4 z-50 w-full max-w-sm">
              <Alert className="bg-red-900/80 border-red-700 text-white backdrop-blur-sm animate-in fade-in slide-in-from-right-5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Дождитесь завершения текущей генерации
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <div className="max-w-5xl mx-auto">
            {/* Заголовок */}
            <div className="text-center mb-12 mt-8">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                  Применение практик
                </span>
                {' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 text-5xl sm:text-7xl font-extrabold">
                  MLOps
                </span>
                {' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-red-400">
                  в развертывании моделей машинного обучения
                </span>
              </h1>
              <p className="mt-4 text-lg text-gray-300">
                Кейс на основе Stable Diffusion
              </p>
            </div>

            {/* Основной контент */}
            <div className="flex flex-col md:flex-row gap-8">
              {/* Место для картинки */}
              <div className="w-full md:w-1/2 aspect-square rounded-xl overflow-hidden relative">
                {isGenerating ? (
                  <div className="w-full h-full relative">
                    {/* Предыдущее изображение с размытием */}
                    {generatedImage && (
                      <div className="absolute inset-0">
                        <img 
                          src={generatedImage} 
                          alt="Предыдущее изображение"
                          className="w-full h-full object-contain blur-md scale-105 opacity-50"
                        />
                      </div>
                    )}
                    {/* Оверлей с анимацией */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-950/90 via-purple-950/80 to-gray-950/90 flex flex-col items-center justify-center p-8">
                      <div className="w-full max-w-xs flex flex-col items-center">
                        <div className="relative w-40 h-40 mb-8">
                          {/* Внешний градиентный круг */}
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-spin-slow blur-xl opacity-30"></div>
                          {/* Внутренний темный круг */}
                          <div className="absolute inset-4 bg-gray-900 rounded-full"></div>
                          {/* Средний градиентный круг */}
                          <div className="absolute inset-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                          {/* Внутренний пульсирующий круг */}
                          <div className="absolute inset-12 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full animate-ping opacity-50"></div>
                        </div>
                        <div className="text-center space-y-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 blur-lg opacity-30"></div>
                            <p className="relative text-3xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                              Создаем ваше изображение
                            </p>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-lg opacity-30"></div>
                            <div className="relative text-xl font-medium text-gray-200 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                              {remainingMinutes === null ? (
                                "Подготовка..."
                              ) : remainingMinutes < 1 ? (
                                <span className="text-white">Еще чуть-чуть ⚡️</span>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className="text-gray-300 text-lg mb-2">Осталось</span>
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-20 animate-spin-slow"></div>
                                    <span className="relative font-mono text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent leading-none">
                                      {Math.round(remainingMinutes)}
                                    </span>
                                  </div>
                                  <span className="text-gray-300 text-lg mt-2">
                                    {Math.round(remainingMinutes) === 1 ? 'минута' : 
                                     Math.round(remainingMinutes) >= 2 && Math.round(remainingMinutes) <= 4 ? 'минуты' : 
                                     'минут'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : generatedImage ? (
                  <div className="w-full h-full relative bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 group">
                    <img 
                      src={generatedImage} 
                      alt="Сгенерированное изображение"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                    <div className="relative w-32 h-32 mb-4">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-20 blur-xl"></div>
                      <div className="absolute inset-2 bg-gray-900 rounded-full"></div>
                      <div className="absolute inset-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 text-center mb-1">
                      Здесь будет ваше изображение
                    </p>
                    <p className="text-sm text-gray-400 text-center max-w-xs">
                      Опишите, что вы хотите увидеть, и нажмите кнопку "Сгенерировать"
                    </p>
                  </div>
                )}
              </div>

              {/* Форма */}
              <div className="w-full md:w-1/2 flex flex-col justify-end space-y-4">
                <div className={`transition-all duration-300 ease-in-out transform ${!autoModel ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button variant="outline" className="w-full hover:bg-gray-800 transition-colors duration-200">
                        Выбрать модель
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent className="bg-gray-950 border-gray-800">
                      <DrawerHeader>
                        <DrawerTitle className="text-white">Выберите модель</DrawerTitle>
                      </DrawerHeader>
                      <div className="p-4">
                        {/* Здесь будет список моделей */}
                      </div>
                    </DrawerContent>
                  </Drawer>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-model"
                    checked={autoModel}
                    onCheckedChange={setAutoModel}
                  />
                  <label
                    htmlFor="auto-model"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Автоматический выбор модели
                  </label>
                </div>
                <Textarea 
                  placeholder="Введите ваш запрос..."
                  className="min-h-[200px] bg-gray-900 border-gray-800 text-white"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90 
                    active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    ${isGenerating ? 'animate-pulse' : ''}`}
                >
                  {isGenerating ? 'Генерация...' : 'Сгенерировать'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Фиксированный блок с оставшимся временем */}
      <div className={`fixed top-20 right-4 z-50 transition-all duration-300 ease-in-out transform ${
        isGenerating && remainingMinutes !== null && remainingMinutes >= 1 && showFixedTimer 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full pointer-events-none'
      }`}>
        <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800 rounded-lg p-4 shadow-lg max-w-[200px]">
          <div className="flex flex-col items-center">
            <span className="text-gray-300 text-sm mb-1">Осталось</span>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-md opacity-20 animate-spin-slow"></div>
              <span className="relative font-mono text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent leading-none">
                {Math.round(remainingMinutes || 0)}
              </span>
            </div>
            <span className="text-gray-300 text-sm mt-1">
              {Math.round(remainingMinutes || 0) === 1 ? 'минута' : 
               Math.round(remainingMinutes || 0) >= 2 && Math.round(remainingMinutes || 0) <= 4 ? 'минуты' : 
               'минут'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}