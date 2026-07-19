import { Check } from "lucide-react";

export function ProjectProgress({ status }: { status: string }) {
  const stages = ["Planned", "Scheduled", "In Progress", "Awaiting Client", "Completed"];
  
  // Basic logic to determine active stages.
  let currentIndex = stages.indexOf(status);
  if (currentIndex === -1) {
    if (status === "Quote Approved" || status === "Draft") currentIndex = 0;
    else currentIndex = 0;
  }

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-[10%] top-1/2 -translate-y-1/2 w-[80%] h-1 bg-slate-200 z-0 rounded-full"></div>
        <div 
          className="absolute left-[10%] top-1/2 -translate-y-1/2 h-1 bg-slate-800 z-0 transition-all duration-500 rounded-full"
          style={{ width: `${(currentIndex / (stages.length - 1)) * 80}%` }}
        ></div>
        
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={stage} className="relative z-10 flex flex-col items-center gap-2 flex-1">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                  ${isCompleted ? "bg-slate-800 border-slate-800 text-white" : 
                    isCurrent ? "bg-white border-slate-800 text-slate-800 shadow-sm" : 
                    "bg-white border-slate-200 text-slate-500"}`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider text-center
                ${isCurrent ? "text-slate-800 font-bold" : isCompleted ? "text-slate-600" : "text-slate-500 hidden sm:block"}`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
