"use client"

import { useState } from "react"
import TransitionLink from "@/lib/tansitionLink"
import { HomeIcon, Github, Folder } from "lucide-react"

export default function Footer() {
  const iconStyles = "transition-opacity duration-300 absolute"
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null)

  return (<footer className="fixed bottom-0 left-0 right-0 z-50 pb-6 transition-opacity duration-300">
    <div className="relative mx-auto px-4 rounded-2xl w-fit border-4 border-zinc-200/10 bg-zinc-800/20 shadow-lg text-white/60 transition-all duration-300 hover:bg-zinc-900/60 group hover:border-zinc-400/30">
      <div className="flex justify-center space-x-3 p-3">
  
        {/* Home Icon */}
        <TransitionLink
          href="/"
          className="group relative w-8 h-8 flex items-center justify-center"
          onMouseEnter={() => setHoveredIcon("home")}
          onMouseLeave={() => setHoveredIcon(null)}
        >
          <div
            className={`absolute inset-0 rounded-lg transition-colors duration-200 ${
              hoveredIcon === "home" ? "bg-blue-600" : "bg-transparent"
            }`}
          ></div>
          <div className="relative w-5 h-5 flex items-center justify-center">
            <HomeIcon size={20} className={`${iconStyles} text-white`} />
          </div>
        </TransitionLink>
  
        {/* Divider */}
        <div className="inline-block max-h-auto w-0.5 self-stretch bg-zinc-400"></div>
  
        {/* Folder Icon - middle link */}
        <TransitionLink
          href="https://www.probin.me"
          className="group relative w-8 h-8 flex items-center justify-center"
          onMouseEnter={() => setHoveredIcon("folder")}
          onMouseLeave={() => setHoveredIcon(null)}
        >
          <div
            className={`absolute inset-0 rounded-lg transition-colors duration-200 ${
              hoveredIcon === "folder" ? "bg-blue-600" : "bg-transparent"
            }`}
          ></div>
          <div className="relative w-5 h-5 flex items-center justify-center">
            <Folder size={20} className={`${iconStyles} text-white`} />
          </div>
        </TransitionLink>
  
        {/* Divider */}
        <div className="inline-block max-h-auto w-0.5 self-stretch bg-zinc-400"></div>
  
        {/* GitHub Icon */}
        <TransitionLink
          href="https://github.com/pro0o/raft-in-motion/"
          className="group relative w-8 h-8 flex items-center justify-center"
          onMouseEnter={() => setHoveredIcon("github")}
          onMouseLeave={() => setHoveredIcon(null)}
        >
          <div
            className={`absolute inset-0 rounded-lg transition-colors duration-200 ${
              hoveredIcon === "github" ? "bg-blue-600" : "bg-transparent"
            }`}
          ></div>
          <div className="relative w-5 h-5 flex items-center justify-center">
            <Github size={20} className={`${iconStyles} text-white`} />
          </div>
        </TransitionLink>
  
      </div>
    </div>
  </footer>
  
  )
}
