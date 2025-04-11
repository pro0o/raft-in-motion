'use client'

import { motion } from "framer-motion"

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-40 dark:opacity-20">
        <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700"></div>
        <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600"></div>
      </div>

      <div className="relative container mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8"
        >
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl md:text-6xl"
          >
            <span className="block">Raft in Motion</span>
            <span className="block text-blue-200 mt-2 text-2xl sm:text-3xl">
              Visualizing Distributed Consensus
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto max-w-xl text-lg text-blue-100 sm:text-xl"
          >
            An interactive simulation of the Raft consensus algorithm implemented in Go,
            helping you understand distributed systems in action.
          </motion.p>

        </motion.div>
      </div>
    </div>
  )
}

