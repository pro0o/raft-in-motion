'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLogs } from '@/context/logsContext'

interface ServerState {
  id: number
  raftID: number
  state: 'Follower' | 'Candidate' | 'Leader'
  term: number
  votedFor: number | null
}

interface VoteAnimation {
  from: number
  to: number
  type: 'request' | 'reply'
}

function formatLogDescription(log: any) {
  switch (log.event) {
    case 'StateTransition':
      return `Server ${log.raftID} transitioned to ${log.newState} state in term ${log.term}`
    case 'RequestVoteReceived':
      return `Server ${log.raftID} received vote request from Server ${log.candidateId} for term ${log.candidateTerm}`
    case 'RequestVoteReplyReceived':
      return `Server ${log.raftID} received vote reply from Server ${log.from}`
    default:
      return `Unknown event: ${log.event}`
  }
}

export default function RaftVisualization() {
  const { logs } = useLogs()
  const [servers, setServers] = useState<ServerState[]>([
    { id: 0, raftID: 0, state: 'Follower', term: 0, votedFor: null },
    { id: 1, raftID: 1, state: 'Follower', term: 0, votedFor: null },
    { id: 2, raftID: 2, state: 'Follower', term: 0, votedFor: null }
  ])
  const [voteAnimations, setVoteAnimations] = useState<VoteAnimation[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to the bottom when new logs are added
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  useEffect(() => {
    logs.forEach((log) => {
      if (log.event === "StateTransition") {
        setServers(prev => prev.map(server => 
          server.raftID === log.raftID 
            ? { 
                ...server, 
                state: log.newState as 'Follower' | 'Candidate' | 'Leader',
                term: log.term || server.term
              }
            : server
        ))
      }
      
      if (log.event === "RequestVoteReceived") {
        setVoteAnimations(prev => [
          ...prev,
          { from: log.candidateId!, to: log.raftID!, type: 'request' }
        ])
        
        setServers(prev => prev.map(server => 
          server.id === log.raftID 
            ? { 
                ...server,
                term: log.candidateTerm || server.term,
                votedFor: log.candidateId || null
              }
            : server
        ))
      }

      if (log.event === "RequestVoteReplyReceived") {
        setVoteAnimations(prev => {
          const filteredAnimations = prev.filter(anim => 
            !(anim.type === 'request' && anim.from === log.from && anim.to === log.raftID)
          )
          return [
            ...filteredAnimations,
            { from: log.from!, to: log.raftID!, type: 'reply' }
          ]
        })
      }
    })
  }, [logs])

  const getVoteLinePosition = (from: number, to: number) => {
    const serverWidth = 256
    const containerPadding = 32
    const spacing = 64

    const serverPositions = [
      containerPadding + serverWidth/2,
      containerPadding + serverWidth + spacing + serverWidth/2,
      containerPadding + 2 * serverWidth + 2 * spacing + serverWidth/2
    ]

    const x1 = serverPositions[from]
    const x2 = serverPositions[to]
    const y = 50

    return { x1, y, x2, y }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      {/* SVG layer for vote lines */}
      <div className="absolute inset-0 top-0 pointer-events-none">
        <svg className="w-full h-full">
          <AnimatePresence>
            {voteAnimations.map((vote, index) => {
              const pos = getVoteLinePosition(vote.from, vote.to)
              return (
                <g key={`${vote.from}-${vote.to}-${vote.type}-${index}`}>
                  <motion.line
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    exit={{ pathLength: 0 }}
                    transition={{ duration: 0.5 }}
                    x1={pos.x1}
                    y1={pos.y}
                    x2={pos.x2}
                    y2={pos.y}
                    stroke={vote.type === 'request' ? '#3B82F6' : '#10B981'}
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                  <circle
                    cx={pos.x1}
                    cy={pos.y}
                    r="6"
                    fill={vote.type === 'request' ? '#3B82F6' : '#10B981'}
                  />
                  <circle
                    cx={pos.x2}
                    cy={pos.y}
                    r="6"
                    fill={vote.type === 'request' ? '#3B82F6' : '#10B981'}
                  />
                  <motion.circle
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      translateX: [pos.x1, pos.x2],
                      translateY: [pos.y, pos.y],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.5,
                      ease: "linear"
                    }}
                    r="6"
                    fill={vote.type === 'request' ? '#3B82F6' : '#10B981'}
                  />
                </g>
              )
            })}
          </AnimatePresence>
        </svg>
      </div>
     
      {/* Servers */}
      <div className="flex justify-between items-center mb-8 gap-16 mt-12">
        {servers.map((server) => (
          <motion.div
            key={server.id}
            className={`p-6 rounded-lg shadow-lg w-64 ${
              server.state === 'Leader' 
                ? 'bg-green-100 border-2 border-green-500' 
                : server.state === 'Candidate'
                ? 'bg-yellow-100 border-2 border-yellow-500'
                : 'bg-white border-2 border-gray-200'
            }`}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-2">Server {server.id}</h3>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">State:</span>{' '}
                <span className={
                  server.state === 'Leader' 
                    ? 'text-green-600' 
                    : server.state === 'Candidate'
                    ? 'text-yellow-600'
                    : 'text-gray-600'
                }>
                  {server.state}
                </span>
              </p>
              <p className="text-sm">
                <span className="font-medium">Term:</span> {server.term}
              </p>
              <p className="text-sm">
                <span className="font-medium">Voted For:</span>{' '}
                {server.votedFor !== null ? `Server ${server.votedFor}` : 'None'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Event Description and Log History */}
      <div className="mt-8 space-y-4">
        {/* Current Event */}
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
          <h3 className="font-medium text-sm text-primary mb-2">Current Event</h3>
          <p className="text-sm text-primary/90">
            {logs.length > 0 
              ? formatLogDescription(logs[logs.length - 1])
              : "Waiting for events..."}
          </p>
        </div>

        {/* Log History */}
        <div className="bg-gray-100 rounded-lg border border-gray-200">
          <h3 className="font-medium text-sm p-4 border-b border-gray-200">Event History</h3>
          <div className="max-h-48 overflow-y-auto">
            <div className="divide-y divide-gray-200">
              {logs.slice().reverse().map((log, index) => (
                <div 
                  key={index}
                  className={`p-4 text-sm ${
                    index === 0 ? 'bg-primary/5' : ''
                  }`}
                >
                  {formatLogDescription(log)}
                </div>
              ))}
            </div>
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            <span className="text-sm text-gray-600">Vote Request</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            <span className="text-sm text-gray-600">Vote Reply</span>
          </div>
        </div>
      </div>
    </div>
  )
}

