import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function SimulateButton() {
  return (
    <div className="relative flex justify-center items-center h-screen">
      <div className="group relative inline-block">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden rounded-md">
          <div
            className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-lime-200 rounded-lg blur-lg opacity-70 
                      group-hover:opacity-90 transition duration-300 
                      animate-[pulse_3s_ease-in-out_infinite] group-hover:animate-[spin_4s_linear_infinite]"
          ></div>

          <div
            className="absolute -inset-1 bg-gradient-to-tr from-blue-400 via-blue-500 to-sky-400 rounded-lg blur-lg opacity-70 
                      group-hover:opacity-90 transition duration-300 
                      animate-[pulse_4s_ease-in-out_infinite] group-hover:animate-[spin_3s_linear_infinite]"
            style={{ animationDirection: "reverse" }}
          ></div>

          <div
            className="absolute -inset-1 bg-gradient-to-bl from-zinc-200 via-teal-500 to-cyan-500 rounded-lg blur-lg opacity-70 
                      group-hover:opacity-90 transition duration-300 
                      animate-[pulse_5s_ease-in-out_infinite] group-hover:animate-[spin_5s_linear_infinite]"
          ></div>
        </div>

        <Button
          className={cn(
            "relative z-8 transition-all duration-300",
            "bg-zinc-200",
            "group-hover:bg-white/10 group-hover:backdrop-blur-md group-hover:border-white",
            "text-zinc-800 text-xs group-hover:text-zinc-200", // Updated text color on hover
            "shadow-none",
            "group-hover:[box-shadow:0_0_16px_2px_rgba(103,232,249,0.3)]", // Custom box-shadow for all-around glow
            "px-6 py-2 text-md font-medium",
          )}
        >
          Simulate
        </Button>
      </div>
    </div>
  )
}
