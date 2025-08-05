"use client"

import { useRef } from "react"
import { type MotionValue, animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { type LucideIcon } from "lucide-react"
import TransitionLink from "@/lib/tansitionLink"
import { HomeIcon, Github, Folder } from "lucide-react"

const SCALE = 1.8 
const DISTANCE = 80
const NUDGE = 25

const SPRING = {
  mass: 0.1,
  stiffness: 170,
  damping: 12,
} as const

// Define the navigation item type
type NavigationItem = {
  icon: LucideIcon
  href: string
  label: string
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { icon: HomeIcon, href: "/", label: "Home" },
  { icon: Folder, href: "https://www.probin.me", label: "Portfolio" },
  { icon: Github, href: "https://github.com/pro0o/raft-in-motion/", label: "GitHub" },
]

export default function Footer() {
  const mouseLeft = useMotionValue(Number.NEGATIVE_INFINITY)
  const mouseRight = useMotionValue(Number.NEGATIVE_INFINITY)

  const left = useTransform(mouseLeft, [0, 40], [0, -40])
  const right = useTransform(mouseRight, [0, 40], [0, -40])

  const leftSpring = useSpring(left, SPRING)
  const rightSpring = useSpring(right, SPRING)

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 pb-6 transition-opacity duration-300">
      <motion.div
        onMouseMove={(e) => {
          const { left, right } = e.currentTarget.getBoundingClientRect()
          const offsetLeft = e.clientX - left
          const offsetRight = right - e.clientX
          mouseLeft.set(offsetLeft)
          mouseRight.set(offsetRight)
        }}
        onMouseLeave={() => {
          mouseLeft.set(Number.NEGATIVE_INFINITY)
          mouseRight.set(Number.NEGATIVE_INFINITY)
        }}
        className="relative mx-auto px-4 rounded-2xl w-fit bg-zinc-800/20 shadow-lg text-white/60 transition-all duration-300 hover:bg-zinc-900/60 group hidden sm:block"
      >
        <motion.div
          className="absolute rounded-2xl inset-y-0 bg-zinc-900/60 -z-10"
          style={{ left: leftSpring, right: rightSpring }}
        />
        <div className="flex justify-center items-end space-x-3 p-3">
          {NAVIGATION_ITEMS.map((item, index) => (
            <div key={index} className="flex items-center">
              <AppIcon mouseLeft={mouseLeft} item={item} />
              {index < NAVIGATION_ITEMS.length - 1}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="sm:hidden">
        <div className="relative mx-auto px-4 rounded-2xl w-fit bg-zinc-800/20 shadow-lg text-white/60 transition-all duration-300 hover:bg-zinc-900/60 group">
          <div className="flex justify-center space-x-3 p-3">
            {NAVIGATION_ITEMS.map((item, index) => (
              <div key={index} className="flex items-center">
                <TransitionLink href={item.href} className="group relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-lg transition-colors duration-200 group-hover:bg-blue-600"></div>
                  <div className="relative w-5 h-5 flex items-center justify-center">
                    <item.icon size={20} className="text-white transition-opacity duration-300" />
                  </div>
                </TransitionLink>
                {index < NAVIGATION_ITEMS.length - 1 && (
                  <div className="inline-block max-h-auto w-0.5 h-6 mx-3 bg-zinc-400/50" />
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-xs font-medium text-gray-300">
          View on desktop with a mouse
          <br />
          to see the dock interaction.
        </p>
      </div>
    </footer>
  )
}

// Define proper props interface for AppIcon
interface AppIconProps {
  mouseLeft: MotionValue<number>
  item: NavigationItem
}

function AppIcon({ mouseLeft, item }: AppIconProps) {
  const ref = useRef<HTMLDivElement>(null)

  const distance = useTransform(() => {
    const bounds = ref.current ? { x: ref.current.offsetLeft, width: ref.current.offsetWidth } : { x: 0, width: 0 }
    return mouseLeft.get() - bounds.x - bounds.width / 2
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
    <motion.div 
      ref={ref} 
      style={{ x: xSpring, scale: scaleSpring, y }} 
      className="origin-bottom"
      onClick={handleClick}
    >
      <TransitionLink
        href={item.href}
        className="group relative w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-700/50 hover:bg-blue-600 transition-colors duration-200 shadow-lg"
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          <item.icon size={20} className="text-white" />
        </div>
      </TransitionLink>
    </motion.div>
  )
}