"use client"

import { useRef } from "react"
import { type MotionValue, animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { TypeIcon as type, LucideIcon } from 'lucide-react'
import TransitionLink from "@/lib/tansitionLink"

import { HomeIcon, Github, Folder } from 'lucide-react'

const SCALE = 1.8
const DISTANCE = 80
const NUDGE = 25
const SPRING = {
  mass: 0.1,
  stiffness: 170,
  damping: 12,
} as const

type NavigationItem = {
  icon: LucideIcon
  href: string
  label: string
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { icon: HomeIcon, href: "/", label: "Home" },
  { icon: Folder, href: "https://www.probin.me", label: "my-home" },
  { icon: Github, href: "https://github.com/pro0o/raft-in-motion/", label: "GitHub" },
]

export default function Footer() {
  const mouseX = useMotionValue(Number.NEGATIVE_INFINITY)

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 pb-6 transition-opacity duration-300 hidden sm:block">
      <motion.div
        onMouseMove={(e) => {
          const { left } = e.currentTarget.getBoundingClientRect()
          const offsetMouseX = e.clientX - left
          mouseX.set(offsetMouseX)
        }}
        onMouseLeave={() => {
          mouseX.set(Number.NEGATIVE_INFINITY)
        }}
        className="relative mx-auto px-4 rounded-xl w-fit bg-zinc-800/30 shadow-lg text-white/80 transition-all duration-300 group"
      >
        <motion.div className="absolute rounded-2xl inset-y-0 -z-10" />
        <div className="flex justify-center items-end space-x-3 p-3">
          {NAVIGATION_ITEMS.map((item, index) => (
            <div key={index} className="flex items-center">
              <AppIcon mouseX={mouseX} item={item} />
            </div>
          ))}
        </div>
      </motion.div>
    </footer>
  )
}

interface AppIconProps {
  mouseX: MotionValue<number>
  item: NavigationItem
}

function AppIcon({ mouseX, item }: AppIconProps) {
  const ref = useRef<HTMLDivElement>(null)

  const distance = useTransform(() => {
    const bounds = ref.current ? { x: ref.current.offsetLeft, width: ref.current.offsetWidth } : { x: 0, width: 0 }
    return mouseX.get() - bounds.x - bounds.width / 2
  })

  const scale = useTransform(distance, [-DISTANCE, 0, DISTANCE], [1, SCALE, 1])
  const x = useTransform(() => {
    const d = distance.get()
    if (d === Number.NEGATIVE_INFINITY) {
      return 0
    } else if (d < -DISTANCE || d > DISTANCE) {
      return Math.sign(d) * -1 * NUDGE
    } else {
      return (-d / DISTANCE) * NUDGE * scale.get()
    }
  })

  const scaleSpring = useSpring(scale, SPRING)
  const xSpring = useSpring(x, SPRING)

  const y = useMotionValue(0)
  const handleClick = () => {
    animate(y, [0, -20, 0], {
      repeat: 2,
      ease: [
        [0, 0, 0.2, 1],
        [0.8, 0, 1, 1],
      ],
      duration: 0.6,
    })
  }

  return (
    <motion.div ref={ref} style={{ x: xSpring, scale: scaleSpring, y }} className="origin-bottom" onClick={handleClick}>
      <TransitionLink
        href={item.href}
        className="group relative w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800/60 hover:bg-blue-600 transition-colors duration-200 shadow-lg"
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          <item.icon size={20} className="text-white" />
          <span className="sr-only">{item.label}</span>
        </div>
      </TransitionLink>
    </motion.div>
  )
}
