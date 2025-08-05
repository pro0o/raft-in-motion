"use client"
import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useMediaQuery } from "@/context/mediaQuery"
import { Button } from "@/components/ui/button"

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")
  const imageSize = isMobile ? 500 : isTablet ? 600 : 500

  const handleSimulateClick = () => {
    setIsLoading(true)
    router.prefetch("/raft")
    setTimeout(() => {
      router.push("/raft")
    }, 2000)
  }

  const containerAnimation = {
    hidden: {
      opacity: 0,
      scale: 0.96,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.25, 0.1, 0.25, 1],
        when: "beforeChildren",
      },
    },
  }

  return (
    <div className="flex items-center justify-center bg-white min-h-screen px-4 py-4 sm:py-6 md:py-8 ">
      <motion.div
        className="w-full max-w-3xl mx-auto bg-zinc-900 overflow-hidden shadow-2xl rounded-2xl sm:rounded-2xl"
        initial="hidden"
        animate="visible"
        variants={containerAnimation}
      >
        <div className="flex flex-col items-center sm:p-3 md:p-4">
          <motion.img
            src="/assets/bg.png"
            alt="Raft"
            width={imageSize}
            height={imageSize}
            className="object-cover rounded-md pb-6" // Added pb-6 for padding-bottom
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
          />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.8 }}>
            <Button
              onClick={handleSimulateClick}
              disabled={isLoading}
              className="bg-zinc-200 border-4 tracking-tighter font-medium mb-2 border-zinc-400/20 shadow-[0_2px_6px_rgba(255,255,255,0.2)] rounded-lg text text-neutral-800 text-base sm:text-lg md:text-2xl transition-all duration-800 py-5 px-7 sm:px-8 hover:bg-blue-600 hover:text-white group flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-8 w-8 text-gray-900 group-hover:text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                </>
              ) : (
                <>Simulate</>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default HomePage