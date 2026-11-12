import React from 'react';
import { TechnicalViews } from '../types/dripwatch';
import { 
  Building2, 
  Monitor, 
  Focus, 
  Eye, 
  Cpu, 
  GitFork, 
  Microscope, 
  Clock 
} from 'lucide-react';

interface TechnicalViewsBarProps {
  views: TechnicalViews;
  onToggleView: (key: keyof TechnicalViews) => void;
  onFlyToFloor: () => void;
  onFlyToControlRoom: () => void;
  onFollowLeak: () => void;
  onOpenControlRoomModal: () => void;
  onToggleTimeline: () => void;
  isTimelineOpen: boolean;
  hasActiveLeak: boolean;
}

export const TechnicalViewsBar: React.FC<TechnicalViewsBarProps> = ({
  views,
  onToggleView,
  onFlyToFloor,
  onFlyToControlRoom,
  onFollowLeak,
  onOpenControlRoomModal,
  onToggleTimeline,
  isTimelineOpen,
  hasActiveLeak
}) => {
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-[#0B1F3A] rounded-[6px] border border-[#1E3557] shadow-xl max-w-[96vw] font-formal-sans">
      
      {/* 1. Floor View */}
      <button
        onClick={onFlyToFloor}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-slate-300 hover:text-white hover:bg-[#11294d] transition-colors"
        title="Wide factory floor overview"
      >
        <Building2 className="w-3.5 h-3.5 text-[#1FA5A0]" />
        <span className="hidden sm:inline">Floor view</span>
      </button>

      {/* 2. Control Room View */}
      <button
        onClick={onFlyToControlRoom}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-slate-300 hover:text-white hover:bg-[#11294d] transition-colors"
        title="Mezzanine control room overview"
      >
        <Monitor className="w-3.5 h-3.5 text-[#2E8540]" />
        <span className="hidden sm:inline">Control room view</span>
      </button>

      {/* 3. Follow the Leak */}
      <button
        onClick={onFollowLeak}
        disabled={!hasActiveLeak}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-all ${
          hasActiveLeak 
            ? 'bg-[#C0392B]/20 text-rose-300 border border-[#C0392B]/50 hover:bg-[#C0392B]/30' 
            : 'text-slate-500 hover:bg-transparent cursor-not-allowed'
        }`}
        title="Zoom camera to active leak machine"
      >
        <Focus className="w-3.5 h-3.5" />
        <span>Follow leak</span>
      </button>

      <div className="w-[1px] h-4 bg-[#1E3557] mx-0.5 hidden sm:block" />

      {/* 4. X-Ray Machine */}
      <button
        onClick={() => onToggleView('xrayMachine')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-all ${
          views.xrayMachine 
            ? 'bg-[#1FA5A0] text-slate-950 font-semibold shadow-sm' 
            : 'text-slate-300 hover:text-white hover:bg-[#11294d]'
        }`}
        title="Transparent machine chassis showing hydraulic pump, motor, and tank"
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden md:inline">X-ray machine</span>
      </button>

      {/* 5. Open Node */}
      <button
        onClick={() => onToggleView('openController')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-all ${
          views.openController 
            ? 'bg-[#2E8540] text-white font-semibold shadow-sm' 
            : 'text-slate-300 hover:text-white hover:bg-[#11294d]'
        }`}
        title="Transparent node box showing 5 functional PCB blocks"
      >
        <Cpu className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Open node</span>
      </button>

      {/* 6. Signal Paths */}
      <button
        onClick={() => onToggleView('signalPaths')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-all ${
          views.signalPaths 
            ? 'bg-[#1FA5A0] text-slate-950 font-semibold shadow-sm' 
            : 'text-slate-300 hover:text-white hover:bg-[#11294d]'
        }`}
        title="Animated signal telemetry traveling along physical cables to node box"
      >
        <GitFork className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Signal paths</span>
      </button>

      {/* 7. Inside Sensor Cutaway */}
      <button
        onClick={() => onToggleView('insideSensor')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium text-slate-300 hover:text-white hover:bg-[#11294d] transition-colors"
        title="Inspection of dual AC electrodes and optical IR refraction"
      >
        <Microscope className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Inside sensor</span>
      </button>

      <div className="w-[1px] h-4 bg-[#1E3557] mx-0.5 hidden sm:block" />

      {/* 8. Latency Timeline Toggle */}
      <button
        onClick={onToggleTimeline}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-all ${
          isTimelineOpen 
            ? 'bg-[#D98200] text-slate-950 font-semibold shadow-sm' 
            : 'text-slate-300 hover:text-white hover:bg-[#11294d]'
        }`}
        title="Detection latency milestones and severity analysis"
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Timeline</span>
      </button>

      {/* 9. Control Room SCADA Terminal */}
      <button
        onClick={onOpenControlRoomModal}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold bg-[#11294d] hover:bg-[#1a3a68] text-white border border-[#1E3557] transition-colors"
        title="Central mezzanine SCADA dispatch terminal"
      >
        <Monitor className="w-3.5 h-3.5 text-[#1FA5A0]" />
        <span>SCADA console</span>
      </button>

    </div>
  );
};
