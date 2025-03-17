import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimulateButtonProps {
  onClick: () => void;
  connectionStatus: 'home' | 'idle' | 'connecting' | 'failed' | 'simulating' | 'cancel';
  onCancel?: () => void;
}

export default function SimulateButton({ 
  onClick, 
  connectionStatus,
  onCancel
}: SimulateButtonProps) {
  
  const isIdleOrHome = connectionStatus === 'idle' || connectionStatus === 'home';

  const buttonText = connectionStatus === 'home' ? "Let's Simulate" :
                     connectionStatus === 'idle' ? "Simulate" :
                     connectionStatus === 'connecting' ? "Connecting" :
                     connectionStatus === 'failed' ? "Failed" :
                     connectionStatus === 'simulating' ? "Simulating" :
                     "Cancel";
  
  const handleClick = () => {
    if (connectionStatus === 'cancel') {
      onCancel?.();
    } else if (isIdleOrHome) {
      onClick();
    }
  };
  
  const isDisabled = connectionStatus === 'connecting' || connectionStatus === 'failed' || connectionStatus === 'simulating';
  
  return (
    <div className="relative flex justify-center items-center">
      <div className={`group relative inline-block ${isDisabled ? 'opacity-80' : ''}`}>
        <div className={`absolute inset-0 opacity-0 ${!isDisabled ? 'group-hover:opacity-100' : ''} transition-opacity duration-300 overflow-hidden rounded-md`}>
          <div
            className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-lime-200 rounded-lg blur-lg opacity-70
             group-hover:opacity-90 transition duration-300
             animate-[pulse_4s_ease-in-out_infinite] group-hover:animate-[spin_4s_linear_infinite]"
          ></div>
          <div
            className="absolute -inset-1 bg-gradient-to-tr from-blue-400 via-blue-500 to-sky-400 rounded-lg blur-lg opacity-70
             group-hover:opacity-90 transition duration-300
             animate-[pulse_5s_ease-in-out_infinite] group-hover:animate-[spin_3s_linear_infinite]"
            style={{ animationDirection: "reverse" }}
          ></div>
          <div
            className="absolute -inset-1 bg-gradient-to-bl from-zinc-200 via-teal-300 to-blue-300 rounded-lg blur-lg opacity-80
             group-hover:opacity-90 transition duration-300
             animate-[pulse_5s_ease-in-out_infinite] group-hover:animate-[spin_5s_linear_infinite]"
          ></div>
        </div>
        <Button
          onClick={handleClick}
          disabled={isDisabled}
          className={cn(
            "relative z-10 transition-all duration-300",
            "bg-zinc-200",
            !isDisabled && "group-hover:bg-white/10 group-hover:backdrop-blur-md group-hover:border-white",
            connectionStatus === 'cancel' ? "text-red-900" : "text-zinc-800", 
            "text-xs tracking-normal",
            !isDisabled && "group-hover:text-zinc-200",
            "shadow-none",
            !isDisabled && "group-hover:[box-shadow:0_0_6px_3px_rgba(103,232,249,0.2),0_0_12px_6px_rgba(56,189,248,0.15),0_0_3px_2px_rgba(186,230,253,0.3)]",
            "px-6 py-2 text-lg font-medium",
          )}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );

}