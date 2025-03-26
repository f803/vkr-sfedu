'use client'

import { Button } from "@/components/ui/button"
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import { Menu, X } from 'lucide-react'

export function Navbar() {
  const [activeSection, setActiveSection] = useState('')
  const [showGradient, setShowGradient] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['carousel-section', 'tools-section', 'documentation']
      const viewportHeight = window.innerHeight
      const scrollPosition = window.scrollY

      // Если мы в верхней части страницы, не подсвечиваем никакую секцию
      if (scrollPosition < viewportHeight * 0.5) {
        setActiveSection('')
        setShowGradient(false)
        return
      }

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          const elementTop = rect.top + scrollPosition
          const elementBottom = elementTop + rect.height

          // Для документации используем более точную проверку
          if (section === 'documentation') {
            if (scrollPosition >= elementTop - viewportHeight * 0.3) {
              setActiveSection(section)
              setTimeout(() => setShowGradient(true), 500)
              break
            }
          } else {
            // Для остальных секций оставляем прежнюю логику
            if (scrollPosition >= elementTop - viewportHeight * 0.3 && 
                scrollPosition < elementBottom - viewportHeight * 0.3) {
              setActiveSection(section)
              setTimeout(() => setShowGradient(true), 500)
              break
            }
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Проверяем начальное состояние

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveSection('')
    setShowGradient(false)
    setIsMenuOpen(false)
  }

  const scrollToCarousel = () => {
    document.getElementById('carousel-section')?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  const scrollToTools = () => {
    document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  const scrollToDocumentation = () => {
    document.getElementById('documentation')?.scrollIntoView({ behavior: 'smooth' })
    setIsMenuOpen(false)
  }

  const getButtonStyle = (section: string) => {
    if (activeSection === section) {
      return `text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 font-semibold hover:from-pink-400 hover:via-purple-400 hover:to-indigo-400`
    }
    return "text-gray-300 hover:text-gray-400 transition-colors"
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/60 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Логотип - теперь виден на всех устройствах */}
          <div 
            onClick={scrollToTop}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logosfeduruswhite.svg"
              alt="ЮФУ"
              width={160}
              height={53}
              className="h-10 w-auto"
              priority
            />
          </div>
          
          {/* Мобильное меню */}
          <div className="md:hidden flex items-center gap-4">
            {/* GitHub иконка */}
            <a 
              href="https://github.com/yourusername/yourrepo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer group"
            >
              <div className="w-6 h-6 relative">
                <Image
                  src="/github.svg"
                  alt="GitHub"
                  width={24}
                  height={24}
                  className="absolute inset-0 filter brightness-0 invert group-hover:opacity-0 transition-all duration-300"
                />
                <Image
                  src="/github-color.svg"
                  alt="GitHub"
                  width={24}
                  height={24}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
            </a>
            
            {/* Кнопка меню */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Десктопное меню */}
          <div className="hidden md:flex gap-4 absolute left-1/2 transform -translate-x-1/2">
            <Button 
              variant="ghost" 
              className={`${getButtonStyle('carousel-section')} hover:bg-transparent focus-visible:bg-transparent active:bg-transparent`}
              onClick={scrollToCarousel}
            >
              Превью
            </Button>
            <Button 
              variant="ghost" 
              className={`${getButtonStyle('tools-section')} hover:bg-transparent focus-visible:bg-transparent active:bg-transparent`}
              onClick={scrollToTools}
            >
              Инструменты
            </Button>
            <Button 
              variant="ghost" 
              className={`${getButtonStyle('documentation')} hover:bg-transparent focus-visible:bg-transparent active:bg-transparent`}
              onClick={scrollToDocumentation}
            >
              Документация
            </Button>
          </div>

          {/* GitHub иконка для десктопа */}
          <div className="hidden md:flex items-center">
            <a 
              href="https://github.com/yourusername/yourrepo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cursor-pointer group"
            >
              <div className="w-6 h-6 relative">
                <Image
                  src="/github.svg"
                  alt="GitHub"
                  width={24}
                  height={24}
                  className="absolute inset-0 filter brightness-0 invert group-hover:opacity-0 transition-all duration-300"
                />
                <Image
                  src="/github-color.svg"
                  alt="GitHub"
                  width={24}
                  height={24}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                />
              </div>
            </a>
          </div>
        </div>

        {/* Мобильное выпадающее меню */}
        <div ref={menuRef} className={`md:hidden transition-all duration-300 ease-in-out ${
          isMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        } overflow-hidden absolute left-0 right-0 top-full bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 shadow-lg`}>
          <div className="py-4 space-y-2 px-4">
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${getButtonStyle('carousel-section')}`}
              onClick={scrollToCarousel}
            >
              Превью
            </Button>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${getButtonStyle('tools-section')}`}
              onClick={scrollToTools}
            >
              Инструменты
            </Button>
            <Button 
              variant="ghost" 
              className={`w-full justify-start ${getButtonStyle('documentation')}`}
              onClick={scrollToDocumentation}
            >
              Документация
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
} 