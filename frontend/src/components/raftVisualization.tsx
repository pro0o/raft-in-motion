// "use client"

// import { useState, useEffect } from "react"
// import { motion } from "framer-motion"
// import { useLogs } from "@/context/logsContext"
// import { Activity } from "lucide-react"

// interface ServerState {
//   id: number
//   raftID: number
//   state: "Follower" | "Candidate" | "Leader"
//   term: number
//   votedFor: number | null
//   hasVoted: boolean
// }

// function formatLogDescription(log: any) {
//   switch (log.event) {
//     case "StateTransition":
//       return `Server ${log.raftID} transitioned to ${log.newState} state in term ${log.term}`
//     case "RequestVoteReceived":
//       return `Server ${log.raftID} received vote request from Server ${log.candidateId} for term ${log.candidateTerm}`
//     case "RequestVoteReplyReceived":
//       return `Server ${log.raftID} received vote reply from Server ${log.from}`
//     default:
//       return `Unknown event: ${log.event}`
//   }
// }

// export default function RaftVisualization() {
//   const { logs } = useLogs()
//   const [servers, setServers] = useState<ServerState[]>([
//     { id: 0, raftID: 0, state: "Follower", term: 0, votedFor: null, hasVoted: false },
//     { id: 1, raftID: 1, state: "Follower", term: 0, votedFor: null, hasVoted: false },
//     { id: 2, raftID: 2, state: "Follower", term: 0, votedFor: null, hasVoted: false },
//   ])

//   useEffect(() => {
//     logs.forEach((log) => {
//       if (log.event === "StateTransition") {
//         setServers((prev) =>
//           prev.map((server) =>
//             server.raftID === log.raftID
//               ? {
//                   ...server,
//                   state: log.newState as "Follower" | "Candidate" | "Leader",
//                   term: log.term || server.term,
//                 }
//               : server,
//           ),
//         )
//       }

//       if (log.event === "RequestVoteReceived") {
//         setServers((prev) =>
//           prev.map((server) =>
//             server.id === log.raftID
//               ? {
//                   ...server,
//                   term: log.candidateTerm || server.term,
//                   votedFor: log.candidateId || null,
//                   hasVoted: true,
//                 }
//               : server,
//           ),
//         )
//       }

//       if (log.event === "RequestVoteReplyReceived") {
//         setServers((prev) =>
//           prev.map((server) =>
//             server.term !== log.term
//               ? {
//                   ...server,
//                   hasVoted: false,
//                 }
//               : server,
//           ),
//         )
//       }
//     })
//   }, [logs])

//   const getServerColor = (server: ServerState) => {
//     if (server.state === "Leader") {
//       return "bg-green-100 border-green-500"
//     } else if (server.state === "Candidate") {
//       return "bg-yellow-100 border-yellow-500"
//     } else if (server.hasVoted) {
//       return "bg-blue-100 border-blue-500"
//     }
//     return "bg-white border-gray-200"
//   }

//   const getTextColor = (server: ServerState) => {
//     if (server.state === "Leader") {
//       return "text-green-600"
//     } else if (server.state === "Candidate") {
//       return "text-yellow-600"
//     } else if (server.hasVoted) {
//       return "text-blue-600"
//     }
//     return "text-gray-600"
//   }

//   return (
//     <div className="p-8 max-w-4xl mx-auto">
//       {/* Servers */}
//       <div className="flex justify-between items-center mb-8 gap-16 mt-12">
//         {servers.map((server) => (
//           <motion.div
//             key={server.id}
//             className={`p-6 rounded-lg shadow-lg w-64 border-4 ${getServerColor(server)}`}
//             initial={{ scale: 0.9 }}
//             animate={{
//               scale: 1,
//               boxShadow:
//                 server.state === "Leader"
//                   ? [
//                       "0px 0px 0px rgba(34, 197, 94, 0)",
//                       "0px 0px 20px rgba(34, 197, 94, 0.4)",
//                       "0px 0px 0px rgba(34, 197, 94, 0)",
//                     ]
//                   : "0px 4px 6px rgba(0, 0, 0, 0.1)",
//             }}
//             transition={{
//               duration: 0.2,
//               boxShadow: {
//                 duration: 2,
//                 repeat: Number.POSITIVE_INFINITY,
//                 ease: "easeInOut",
//               },
//             }}
//           >
//             <h3 className="text-xl font-medium text-gray-800 mb-2">Server {server.id}</h3>
//             <div className="space-y-2">
//               <p className="text-sm">
//                 <span className="font-medium text-gray-600">State:</span> <span className={getTextColor(server)}>{server.state}</span>
//               </p>
//               <p className="text-sm">
//                 <span className="font-medium text-gray-600">Term:</span> {server.term}
//               </p>
//             </div>
//           </motion.div>
//         ))}
//       </div>
//     {/* Legend */}  
//   <div className="flex gap-4 p-4 bg-gray-100 rounded-lg">
//           <div className="flex items-center">
//             <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
//             <span className="text-sm text-gray-600">Leader</span>
//           </div>
//           <div className="flex items-center">
//             <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2" />
//             <span className="text-sm text-gray-600">Candidate</span>
//           </div> 
//           <div className="flex items-center">
//             <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
//             <span className="text-sm text-gray-600">Follower</span>
//           </div>
//         </div>
//       {/* Event Description and Log History */}
//       <div className="mt-8 space-y-4">
//         {/* Current Event */}
//         <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
//   <div className="flex items-center gap-2 mb-2.5">
//     <Activity className="h-4 w-4 text-muted-foreground" />
//     <h3 className="text-sm font-medium text-foreground">Current Event</h3>
//   </div>
//   <p className="text-sm text-muted-foreground">
//     {logs.length > 0 ? (
//       formatLogDescription(logs.at(-1))
//     ) : (
//       <span className="flex items-center gap-2">
//         <span className="relative flex h-2 w-2">
//           <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-foreground/30 opacity-75" />
//           <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
//         </span>
//         Waiting for events...
//       </span>
//     )}
//   </p>
// </div>


//         {/* Log History */}
//         <div className="bg-gray-100 rounded-lg border border-gray-200">
//           <h3 className="font-medium text-sm p-4 border-b border-gray-200">Event History</h3>
//           <div className="max-h-64 overflow-y-auto">
//             <div className="flex flex-col-reverse divide-y divide-y-reverse divide-gray-200">
//               {logs.map((log, index) => (
//                 <div key={index} className={`p-4 text-sm ${index === logs.length - 1 ? "bg-primary/5" : ""}`}>
//                   {formatLogDescription(log)}
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

