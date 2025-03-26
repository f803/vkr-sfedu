'use client'

import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { DocumentationSection } from "@/components/documentation-section"
import { AutoCarousel } from "@/components/auto-carousel"
import { ToolsSection } from "@/components/tools-section"

export default function Home() {
  return (
    <main className="relative min-h-screen bg-gray-950/50 overflow-x-hidden">
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <section id="carousel-section" className="min-h-screen flex flex-col pt-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-purple-900/20 to-gray-950/30 animate-gradient-slow"></div>
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="relative z-10 w-full px-4 py-8">
            <h2 className="text-2xl font-semibold text-white pl-4">Ранее сгенерированные изображения</h2>
          </div>
          <div className="relative z-10 flex-1 flex items-center w-full">
            <AutoCarousel />
          </div>
        </section>
        <ToolsSection />
        <section id="documentation" className="min-h-screen pt-20">
          <DocumentationSection />
        </section>
      </div>
    </main>
  )
}
