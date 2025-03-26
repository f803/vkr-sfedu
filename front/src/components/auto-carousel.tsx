'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { useEffect, useState, useCallback } from "react"
import { type EmblaCarouselType } from "embla-carousel"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { API_ENDPOINTS } from '@/config/api'

interface ImageData {
  url: string;
  prompt: string;
}

// Функция для извлечения даты из имени файла
const getDateFromUrl = (url: string): number => {
  // Пример формата: generated_20250324_234757.png
  const match = url.match(/generated_(\d{8})_(\d{6})\.png/)
  if (match) {
    const dateString = match[1] // 20250324
    const timeString = match[2] // 234757
    // Преобразуем в формат, который можно сортировать
    return parseInt(`${dateString}${timeString}`)
  }
  return 0 // Если формат не соответствует
}

export function AutoCarousel() {
  const [api, setApi] = useState<EmblaCarouselType | undefined>()
  const [images, setImages] = useState<ImageData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const fetchImages = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(API_ENDPOINTS.RECENT_IMAGES, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.status === 'success') {
        // Фильтруем изображения без промптов
        let filteredImages = data.images?.filter((img: ImageData) => 
          img.prompt && img.prompt !== "Сгенерированное изображение"
        ) || []
        
        // Сортируем изображения по дате в имени файла (новые сверху)
        filteredImages.sort((a: ImageData, b: ImageData) => getDateFromUrl(b.url) - getDateFromUrl(a.url))
        
        setImages(filteredImages)
      } else {
        throw new Error(data.message || 'Неверный формат ответа от сервера')
      }
    } catch (error) {
      console.error('Ошибка при загрузке изображений:', error)
      setError(error instanceof Error ? error.message : 'Произошла неизвестная ошибка')
      
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchImages()
        }, 5000)
      }
    } finally {
      setIsLoading(false)
    }
  }, [retryCount])

  useEffect(() => {
    fetchImages()
    const interval = setInterval(fetchImages, 30000)
    return () => clearInterval(interval)
  }, [fetchImages])

  useEffect(() => {
    if (!api) {
      return
    }

    api.on("select", () => {
      // Здесь можно добавить логику при смене слайда
    })
  }, [api])

  const handleDownload = async (url: string, prompt: string) => {
    try {
      // Извлекаем имя файла из URL
      const filename = url.split('/').pop() || 'generated-image.png';
      
      // Создаем временный элемент a для скачивания
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      
      // Добавляем элемент в DOM, кликаем по нему и удаляем
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto p-8 flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-gray-400">Загрузка изображений...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto aspect-square flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="flex flex-col items-center gap-4">
          <div className="text-red-500">{error}</div>
          {retryCount < 3 && (
            <div className="text-gray-400">
              Пытаемся восстановить соединение... Попытка {retryCount + 1}/3
            </div>
          )}
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto p-8 flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-gray-400">Нет сгенерированных изображений</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full mx-auto h-full overflow-hidden">
      <Carousel
        setApi={setApi}
        className="w-full h-full"
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
          containScroll: "trimSnaps"
        }}
      >
        <CarouselContent className="h-full">
          {images.map((image, index) => (
            <CarouselItem 
              key={index} 
              className="basis-full sm:basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
            >
              <div className="flex flex-col h-full p-3">
                <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 backdrop-blur-sm group relative">
                  {/* Кнопка для десктопа */}
                  <div className="absolute inset-0 hidden sm:flex items-start justify-end p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/60 via-black/30 to-transparent z-10">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/20"
                      onClick={() => handleDownload(image.url, image.prompt)}
                    >
                      <Download className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                  {/* Кнопка для мобильных устройств */}
                  <div className="absolute inset-x-0 bottom-0 sm:hidden flex items-center justify-center p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white/10 border-white/20 backdrop-blur-sm text-white gap-2 hover:bg-white/20 hover:border-white/40"
                      onClick={() => handleDownload(image.url, image.prompt)}
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Скачать</span>
                    </Button>
                  </div>
                  <div className="w-full h-full transition-transform duration-300 hover:scale-105">
                    <img
                      src={image.url}
                      alt={`Сгенерированное изображение ${index + 1}`}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                </div>
                {image.prompt && (
                  <div className="mt-3 px-1">
                    <div className="flex items-start gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-purple-400" />
                      <p className="leading-relaxed text-gray-300 hover:text-white transition-colors duration-200">
                        {image.prompt}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-2">
          <CarouselPrevious className="relative static top-auto -left-5 translate-y-0 bg-gray-900/70 hover:bg-gray-900 border-gray-800 hover:border-gray-700" />
          <CarouselNext className="relative static top-auto -right-5 translate-y-0 bg-gray-900/70 hover:bg-gray-900 border-gray-800 hover:border-gray-700" />
        </div>
      </Carousel>
    </div>
  )
} 