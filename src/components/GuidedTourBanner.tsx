import React from 'react';
import { GUIDED_TOUR_STEPS } from '../utils/guidedTour';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  X, 
  Activity 
} from 'lucide-react';

interface GuidedTourBannerProps {
  isActive: boolean;
  currentStepIndex: number;
  isPaused: boolean;
  stepProgressPercent: number;
  onTogglePause: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onRestart: () => void;
  onExitTour: () => void;
}

export const GuidedTourBanner: React.FC<GuidedTourBannerProps> = ({
  isActive,
  currentStepIndex,
  isPaused,
  stepProgressPercent,
  onTogglePause,
  onNextStep,
  onPrevStep,
  onRestart,
  onExitTour
}) => {
  if (!isActive) return null;

  const step = GUIDED_TOUR_STEPS[currentStepIndex] || GUIDED_TOUR_STEPS[0];
  const totalSteps = GUIDED_TOUR_STEPS.length;

  return (
    <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 w-[94%] sm:w-auto sm:min-w-[420px] max-w-lg pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-200 font-formal-sans select-none">
      <div className="bg-[#0B1F3A]/90 backdrop-blur-md border border-[#1FA5A0]/60 rounded-[6px] shadow-2xl px-3 py-2 text-white">
        
        {/* Slim Progress Bar */}
        <div className="w-full bg-[#071324]/80 h-1 rounded-full mb-1.5 overflow-hidden">
          <div 
            className="bg-[#1FA5A0] h-full transition-all duration-200 rounded-full"
            style={{ width: `${Math.min(Math.max(stepProgressPercent, 0), 100)}%` }}
          />
        </div>

        {/* Compact Header: Stage Index, Title & Mini Controls */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-[3px] bg-[#1FA5A0]/20 text-[#1FA5A0] shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <div className="text-[9.5px] font-formal-mono text-[#1FA5A0] font-semibold tracking-wider uppercase leading-none">
                {step.stageName} • Step {step.stepIndex} of {totalSteps}
              </div>
              <h3 className="font-semibold text-xs text-white truncate max-w-[210px] sm:max-w-[260px] leading-snug">
                {step.title}
              </h3>
            </div>
          </div>

          {/* Compact Controls */}
          <div className="flex items-center gap-0.5 bg-[#071324]/90 p-0.5 rounded-[4px] border border-[#1E3557] shrink-0">
            <button
              onClick={onPrevStep}
              disabled={currentStepIndex === 0}
              className="h-6 w-6 rounded-[2px] text-slate-400 hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center cursor-pointer"
              title="Previous step"
              aria-label="Previous step"
            >
              <SkipBack className="w-3 h-3" />
            </button>

            <button
              onClick={onTogglePause}
              className="h-6 px-2 rounded-[2px] bg-[#1FA5A0] hover:bg-[#188480] text-slate-950 font-bold text-[10.5px] flex items-center gap-1 transition-colors cursor-pointer"
              title={isPaused ? 'Resume demo' : 'Pause demo'}
              aria-label={isPaused ? 'Resume demo' : 'Pause demo'}
            >
              {isPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
              <span>{isPaused ? 'Play' : 'Pause'}</span>
            </button>

            <button
              onClick={onNextStep}
              disabled={currentStepIndex === totalSteps - 1}
              className="h-6 w-6 rounded-[2px] text-slate-400 hover:text-white disabled:opacity-30 transition-colors flex items-center justify-center cursor-pointer"
              title="Next step"
              aria-label="Next step"
            >
              <SkipForward className="w-3 h-3" />
            </button>

            <button
              onClick={onRestart}
              className="h-6 w-6 rounded-[2px] text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              title="Restart demo"
              aria-label="Restart demo"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <div className="w-[1px] h-3.5 bg-[#1E3557] mx-0.5" />

            <button
              onClick={onExitTour}
              className="h-6 w-6 rounded-[2px] text-slate-400 hover:text-white hover:bg-[#11294D] transition-colors flex items-center justify-center cursor-pointer"
              title="Exit demo"
              aria-label="Exit demo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Compact Caption */}
        <p className="text-[11px] text-slate-200 leading-snug line-clamp-2 mb-1.5">
          {step.caption}
        </p>

        {/* Subtle Footer: Focus Machine & Timing indicator */}
        <div className="flex items-center justify-between text-[9px] font-formal-mono text-slate-400 pt-1 border-t border-[#1E3557]/60">
          <span>Target: {step.focusMachine.toUpperCase()} Plant Cell</span>
          <span className="text-[#1FA5A0]">Auto-advancing • {step.durationSeconds}s</span>
        </div>

      </div>
    </div>
  );
};
