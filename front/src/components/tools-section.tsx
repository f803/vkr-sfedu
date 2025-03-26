'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

const tools = [
  {
    name: "Git",
    description: "Система контроля версий для отслеживания изменений в исходном коде",
    logo: "/logos/git-logo.svg",
  },
  {
    name: "Ansible",
    description: "Автоматизация конфигурации и развертывания инфраструктуры",
    logo: "/logos/ansible-logo.svg",
  },
  {
    name: "Terraform",
    description: "Инфраструктура как код для управления облачными ресурсами",
    logo: "/logos/terraform-logo.svg",
  },
  {
    name: "Docker",
    description: "Контейнеризация приложений для изоляции и переносимости",
    logo: "/logos/docker-logo.svg",
  },
  {
    name: "Kubernetes",
    description: "Оркестрация контейнеров для масштабируемых приложений",
    logo: "/logos/kubernetes-logo.svg",
  },
  {
    name: "MLflow",
    description: "Управление жизненным циклом машинного обучения",
    logo: "/logos/mlflow-logo.svg",
  },
  {
    name: "Grafana",
    description: "Визуализация и мониторинг метрик и логов",
    logo: "/logos/grafana-logo.svg",
  },
]

export function ToolsSection() {
  return (
    <section id="tools-section" className="min-h-screen flex flex-col bg-gray-950/50 overflow-x-hidden">
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">Инструменты</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Современный стек технологий для разработки, развертывания и мониторинга
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Card key={tool.name} className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-lg p-2">
                    <Image
                      src={tool.logo}
                      alt={`${tool.name} logo`}
                      width={40}
                      height={40}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <CardTitle className="text-white">{tool.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400">
                  {tool.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
} 