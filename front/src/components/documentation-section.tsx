'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Terminal } from "lucide-react"

export function DocumentationSection() {
  return (
    <section id="documentation" className="py-16 px-4 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <Alert className="mb-8 bg-gray-950/50 border-gray-800">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="text-white">Документация</AlertTitle>
          <AlertDescription className="text-gray-300">
            Подробная информация о проекте и его компонентах
          </AlertDescription>
        </Alert>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="gitflow" className="border-gray-800">
            <AccordionTrigger className="text-xl font-semibold text-white hover:text-gray-300">
              Gitflow
            </AccordionTrigger>
            <AccordionContent className="text-gray-300">
              <div className="space-y-4">
                <p>
                  Gitflow - это модель ветвления для Git, которая помогает организовать работу над проектом. 
                  Основные ветки:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>main - основная ветка с рабочим кодом</li>
                  <li>develop - ветка разработки</li>
                  <li>feature/* - ветки для новых функций</li>
                  <li>hotfix/* - ветки для срочных исправлений</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="infrastructure" className="border-gray-800">
            <AccordionTrigger className="text-xl font-semibold text-white hover:text-gray-300">
              Инфраструктура
            </AccordionTrigger>
            <AccordionContent className="text-gray-300">
              <div className="space-y-4">
                <p>
                  Наша инфраструктура построена на современных технологиях:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Next.js для фронтенда</li>
                  <li>shadcn/ui для компонентов</li>
                  <li>Tailwind CSS для стилей</li>
                  <li>TypeScript для типизации</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  )
} 