"use client"
import { motion } from "framer-motion"
import { LogsProvider } from "@/context/logsContext"
import ServerInstance from "@/components/serverInstance"
import { LogDispatcherProvider } from "@/context/logsDispatcher"
import PixelGrid from "@/components/pixelGrid"
import EventHistory from "@/components/eventHistory"
import ActionSearchBar from "@/components/ui/actionBar"
import Footer from "../footer"
import { useMediaQuery } from "@/context/mediaQuery"

export default function RaftPage() {
  const instances = [0, 1, 2]
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  const containerAnimation = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  }

  // Sequential animations for each major section
  // Each section has its own delay to create a one-at-a-time appearance
  const serverContainerAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        delay: 0.2, // First element to appear
        when: "beforeChildren",
        staggerChildren: 0.15,
      },
    },
  }

  const rightContainerAnimation = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        delay: 0.8, // Appears after server container
        when: "beforeChildren",
        delayChildren: 0.2,
        staggerChildren: 0.3, // Larger stagger for more sequential appearance
      },
    },
  }

  const serverAnimation = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.15,
        duration: 0.3,
        ease: "easeOut",
      },
    }),
  }

  const searchBarAnimation = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  }

  const pixelGridAnimation = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  }

  const eventHistoryAnimation = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  }

  return (
    <div className="flex flex-col bg-white min-h-screen items-center justify-start  px-4 py-1 sm:py-2 md:pt-2 lg:pt-4 pb-4">
      <LogsProvider>
        <LogDispatcherProvider>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerAnimation}
            className={`flex ${isMobile ? "flex-col" : "flex-row"} w-full max-w-6xl gap-4 md:gap-6 items-center justify-center`}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              variants={serverContainerAnimation}
              className={`${isMobile ? "w-full" : isTablet ? "w-1/2" : "w-2/5"} bg-zinc-900 text-white overflow-hidden shadow-lg rounded-xl sm:rounded-2xl md:rounded-3xl`}
            >
              {instances.map((id) => (
                <motion.div key={id} className="relative" custom={id} variants={serverAnimation}>
                  <ServerInstance raftID={id} />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={rightContainerAnimation}
              className={`${isMobile ? "w-full" : isTablet ? "w-1/2" : "w-2/5"} flex flex-col gap-4`}
            >
              <motion.div variants={searchBarAnimation}>
                <ActionSearchBar />
              </motion.div>

              <motion.div variants={pixelGridAnimation}>
                <PixelGrid />
              </motion.div>
              <motion.div variants={eventHistoryAnimation}>
                <EventHistory />
              </motion.div>

            </motion.div>
          </motion.div>
        </LogDispatcherProvider>
      </LogsProvider>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.7 }} 
        className="mt-auto pt-4"
      >
        <Footer />
      </motion.div>
    </div>
  )
}
