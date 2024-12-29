import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, useCallback } from "react"
import { useLogs } from "@/context/logsContext"

interface Server {
  id: string
  name: string
  totalAttempts: number
  successCount: number
  state: 'FOLLOWER' | 'CANDIDATE' | 'LEADER'
  term: number
}

interface RaftLog {
  state: string
  id: number
  args: string[]
  timestamp: number
}

interface VoteRequest {
  from: string;
  to: string;
  timestamp: number;
}

export default function ServerChart() {
  const { logs } = useLogs();
  
  const ServerLogTable = ({ server }: { server: Server }) => {
    const serverLogs = logs
      .filter((log) => log.state === "Raft" && log.id.toString() === server.id)
      .map((log, index) => {
        const message = Array.isArray(log.args) && log.args.length > 0 ? log.args[0] : '';
        return {
          id: index.toString(),
          message: message.replace(/^\['/, '').replace(/'\]$/, ''),
          timestamp: new Date(log.timestamp / 1000000).toLocaleTimeString()
        };
      }); 

  return (
    <div className="backdrop-blur-sm bg-white/80 rounded-xl overflow-hidden p-4 shadow-lg border border-white/20 w-[400px] transition-all duration-300 hover:bg-white/90">
      <h3 className="text-base font-medium mb-3 text-slate-700">
        {server.name} ({server.state}) - Term {server.term}
      </h3>
      <div className="max-h-[300px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-white/90 backdrop-blur-sm shadow-sm z-10">
            <tr className="border-b border-slate-200/50">
              <th className="border-r border-slate-200/50 p-2 text-left text-slate-600 font-medium">Time</th>
              <th className="p-2 text-left text-slate-600 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {serverLogs.length > 0 ? (
                serverLogs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, backgroundColor: "rgba(16, 185, 129, 0.05)" }}
                    animate={{ opacity: 1, backgroundColor: "rgba(255, 255, 255, 0)" }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                    className="border-b border-slate-200/50 hover:bg-slate-50/50 transition-colors duration-150"
                  >
                    <td className="border-r border-slate-200/50 p-2 text-slate-700 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="p-2 text-slate-700 break-all">
                      {log.message}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-2 text-slate-500 text-center">
                    No logs available
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};
  
  const [servers, setServers] = useState<Server[]>([
    { id: "0", name: "Server 0", totalAttempts: 10, successCount: 7, state: 'FOLLOWER', term: 1 },
    { id: "1", name: "Server 1", totalAttempts: 15, successCount: 10, state: 'FOLLOWER', term: 1 },
    { id: "2", name: "Server 2", totalAttempts: 8, successCount: 3, state: 'LEADER', term: 1 }
  ]);

  const [isSimulating, setIsSimulating] = useState(true);
  const [prevServers, setPrevServers] = useState(servers);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [voteRequests, setVoteRequests] = useState<VoteRequest[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, boolean>>({});

  // Size constants for triangular layout
  const centerX = 300;
  const centerY = 300;
  const radius = 220;

  const getServerPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / 3 - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  // Calculate progress bars directly from servers data
  const maxAttempts = Math.max(...servers.map((s) => s.totalAttempts)) || 1;

  // Initialize connection states
  useEffect(() => {
    const newStates: Record<string, boolean> = {};
    servers.forEach((server, i) => {
      servers.forEach((targetServer, j) => {
        if (i < j) {
          const key = `${server.id}-${targetServer.id}`;
          newStates[key] = Math.random() > 0.5;
        }
      });
    });
    setConnectionStates(newStates);
  }, []);

  // Simulate vote requests
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly select a server to request votes
      const candidateIndex = Math.floor(Math.random() * servers.length);
      const candidate = servers[candidateIndex];
      
      if (candidate) {
        // Create vote requests to all other servers
        const newVoteRequests = servers
          .filter(server => server.id !== candidate.id)
          .map(server => ({
            from: candidate.id,
            to: server.id,
            timestamp: Date.now()
          }));
        
        setVoteRequests(prev => [...prev, ...newVoteRequests]);

        // Clean up old vote requests after animation
        setTimeout(() => {
          setVoteRequests(prev => 
            prev.filter(request => 
              Date.now() - request.timestamp < 2000
            )
          );
        }, 2000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [servers]);

  // Update regular connection states
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStates(prev => {
        const newStates = { ...prev };
        Object.keys(newStates).forEach(key => {
          newStates[key] = Math.random() > 0.5;
        });
        return newStates;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getConnectionSuccess = useCallback((serverId1: string, serverId2: string) => {
    const key = `${serverId1}-${serverId2}`;
    return connectionStates[key] ?? false;
  }, [connectionStates]);

  useEffect(() => {
    setPrevServers(servers);
  }, [servers]);

  return (
    <div className="relative w-[600px] h-[600px] mx-auto">
      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full">
        {servers.map((server, i) => {
          return servers.map((targetServer, j) => {
            if (i < j) {
              const pos1 = getServerPosition(i);
              const pos2 = getServerPosition(j);
              const success = getConnectionSuccess(server.id, targetServer.id);
              
              return (
                <motion.line
                  key={`line-${server.id}-${targetServer.id}`}
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  initial={{ pathLength: 0 }}
                  animate={{ 
                    pathLength: [0, 1, 0],
                    transition: {
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3
                    }
                  }}
                  className={success ? "stroke-emerald-400" : "stroke-red-400"}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
              );
            }
            return null;
          });
        })}
        <AnimatePresence>
          {voteRequests.map((request) => {
            const fromIndex = servers.findIndex(s => s.id === request.from);
            const toIndex = servers.findIndex(s => s.id === request.to);
            const pos1 = getServerPosition(fromIndex);
            const pos2 = getServerPosition(toIndex);

            return (
              <motion.g key={`vote-${request.from}-${request.to}-${request.timestamp}`}>
                {/* Pulse effect behind the line */}
                <motion.line
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  initial={{ pathLength: 0, opacity: 0.5, strokeWidth: 8 }}
                  animate={{ 
                    pathLength: 1,
                    opacity: 0,
                    strokeWidth: 16,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  stroke="rgba(99, 102, 241, 0.2)"
                  strokeLinecap="round"
                />
                {/* Main vote request line */}
                <motion.line
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  stroke="rgb(99, 102, 241)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Moving dot */}
                <motion.circle
                  initial={{ 
                    offsetDistance: "0%",
                    scale: 0
                  }}
                  animate={{ 
                    offsetDistance: "100%",
                    scale: 1
                  }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  r={4}
                  fill="white"
                  stroke="rgb(99, 102, 241)"
                  strokeWidth={2}
                  style={{
                    offsetPath: `path("M ${pos1.x},${pos1.y} L ${pos2.x},${pos2.y}")`,
                  }}
                />
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Servers */}
      {servers.map((server, index) => {
        const pos = getServerPosition(index);
        const normalizedSuccesses = (server.successCount / maxAttempts) * 100;
        const normalizedFailures = ((server.totalAttempts - server.successCount) / maxAttempts) * 100;

        return (
          <div
            key={server.name}
            className="absolute -ml-[50px] -mt-[50px]"
            style={{
              left: pos.x,
              top: pos.y,
            }}
          >
            {/* Progress Bar */}
            <div className="w-full h-2.5 mb-2 flex justify-center items-center">
              <div
                className="relative w-[90px] h-full bg-slate-200/80 rounded-full overflow-hidden"
                style={{
                  boxShadow: `
                    inset 0 1px 2px rgba(0,0,0,0.2),
                    0 1px 0 rgba(255,255,255,0.5)
                  `,
                }}
              >
                <div
                  className="absolute right-[50%] h-full bg-red-400 rounded-l-full transition-all duration-300"
                  style={{
                    width: `${normalizedFailures / 2}%`,
                    boxShadow: "inset -1px 0 2px rgba(0,0,0,0.1)",
                  }}
                />
                <div
                  className="absolute left-[50%] h-full bg-emerald-400 rounded-r-full transition-all duration-300"
                  style={{
                    width: `${normalizedSuccesses / 2}%`,
                    boxShadow: "inset 1px 0 2px rgba(0,0,0,0.1)",
                  }}
                />
                <div className="absolute left-[50%] top-0 w-[1px] h-full bg-slate-300" />
              </div>
            </div>

            {/* Server Box */}
            <div
              className={`w-[100px] h-[100px]
                rounded-lg border 
                flex items-center justify-center
                transform transition-transform hover:scale-105
                cursor-pointer ${
                  server.state === 'LEADER' 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : server.state === 'CANDIDATE'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-slate-200'
                }`}
              onClick={() => setSelectedServer(selectedServer?.id === server.id ? null : server)}
              style={{
                boxShadow: `
                  3px 3px 0 ${server.state === 'LEADER' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(203, 213, 225, 0.4)'},
                  6px 6px 0 ${server.state === 'LEADER' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(203, 213, 225, 0.3)'},
                  inset -2px -2px 4px rgba(0,0,0,0.1)
                `,
              }}
            >
              <div className="text-center">
                <span className="text-sm font-medium text-slate-700 drop-shadow-sm block">
                  {server.name}
                </span>
                <span className="text-xs text-slate-500 block mt-1">
                  {server.state}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Hovering Log Table */}
      {selectedServer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute z-10"
          style={{
            left: getServerPosition(servers.findIndex(s => s.id === selectedServer.id)).x + 60,
            top: getServerPosition(servers.findIndex(s => s.id === selectedServer.id)).y - 30,
          }}
        >
          <div className="relative">
            <ServerLogTable server={selectedServer} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

