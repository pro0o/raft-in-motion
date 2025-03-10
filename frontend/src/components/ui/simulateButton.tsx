import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SimulateButtonProps {
  onClick: () => void;  // Accept the onClick function as a prop
  text: string;         // Accept the text to be displayed on the button
}

export default function SimulateButton({ onClick, text }: SimulateButtonProps) {
  return (
    <div className="relative flex justify-center items-center">
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
          onClick={onClick}  // Pass onClick to Button
          className={cn(
            "relative z-10 transition-all duration-300",
            "bg-zinc-200",
            "group-hover:bg-white/10 group-hover:backdrop-blur-md group-hover:border-white",
            "text-zinc-800 text-xs group-hover:text-zinc-200",
            "shadow-none",
            "group-hover:[box-shadow:0_0_6px_3px_rgba(103,232,249,0.2),0_0_12px_6px_rgba(56,189,248,0.15),0_0_3px_2px_rgba(186,230,253,0.3)]",
            "px-6 py-2 text-lg font-medium",
          )}
        >
          {text}  
        </Button>
      </div>
    </div>
  )
}
