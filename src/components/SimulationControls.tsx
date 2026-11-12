import React from 'react';
import { MachineId, ZoneId, FluidType, LeakSpeed, RenderQuality } from '../types/dripwatch';
import { MACHINES_CONFIG } from '../utils/iotLogic';
import { 
  Play, 
  Square, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  Volume2, 
  VolumeX,
  Layers,
  Sliders
} from 'lucide-react';

interface SimulationControlsProps {
  selectedMachine: MachineId;
  onSelectMachine: (m: MachineId) => void;
  selectedZone: ZoneId;
  onSelectZone: (z: ZoneId) => void;
  selectedFluid: FluidType;
  onSelectFluid: (f: FluidType) => void;
  leakSpeed: LeakSpeed;
  onChangeSpeed: (s: LeakSpeed) => void;
  isLeaking: boolean;
  onToggleLeak: () => void;
  onResetAll: () => void;
  activeLeaks: Record<MachineId, boolean>;
  soundEnabled: boolean;
  onToggleSound: () => void;
  quality: RenderQuality;
  onChangeQuality: (q: RenderQuality) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  selectedMachine,
  onSelectMachine,
  selectedZone,
  onSelectZone,
  selectedFluid,
  onSelectFluid,
  leakSpeed,
  onChangeSpeed,
  isLeaking,
  onToggleLeak,
  onResetAll,
  activeLeaks,
  soundEnabled,
  onToggleSound,
  quality,
  onChangeQuality
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const machineCfg = MACHINES_CONFIG[selectedMachine];
  const allowedFluids = machineCfg.allowedFluids;
  const activeCount = Object.values(activeLeaks).filter(Boolean).length;

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-4xl transition-all duration-200 font-formal-sans">
      
      {/* Collapse Tab */}
      <div className="flex justify-center -mb-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-[#0B1F3A] hover:bg-[#11294d] text-slate-300 text-xs px-4 py-1.5 rounded-t-[6px] border-t border-x border-[#1E3557] flex items-center gap-2 shadow-md transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          <span className="font-medium">{isCollapsed ? 'Show leak controls' : 'Hide controls (wide view)'}</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.2 rounded-[4px] bg-[#C0392B] text-[10px] text-white font-formal-mono font-semibold">
              {activeCount} {activeCount === 1 ? 'active leak' : 'active leaks'}
            </span>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="bg-[#0B1F3A] border border-[#1E3557] rounded-[6px] p-3 sm:p-4 shadow-xl text-slate-100 flex flex-col gap-3">
          
          {/* Row 1: Machine Selector, Fluid Info, and Multi-leak Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1E3557]/80">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-formal-mono tracking-wider text-slate-400 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#1FA5A0]" /> Target machine:
              </span>
              <div className="flex items-center gap-1 bg-[#071324] p-1 rounded-[4px] border border-[#1E3557]">
                {(['m1', 'm2', 'm3', 'm4'] as MachineId[]).map((mId) => {
                  const isCur = selectedMachine === mId;
                  const isMachineLeaking = activeLeaks[mId];
                  return (
                    <button
                      key={mId}
                      onClick={() => onSelectMachine(mId)}
                      className={`px-3 py-1 rounded-[4px] text-xs font-formal-mono font-semibold transition-all relative ${
                        isCur
                          ? 'bg-[#1FA5A0] text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#0B1F3A]'
                      }`}
                    >
                      {mId.toUpperCase()}
                      {isMachineLeaking && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#C0392B] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Machine Name and Fluid Info */}
            <div className="text-xs text-slate-300 font-formal-mono hidden sm:flex items-center gap-2">
              <span className="text-white font-medium">{machineCfg.name}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">
                Specification: {allowedFluids.map(f => f === 'oil' ? 'Hydraulic oil (viscous)' : 'Water coolant (conductive)').join(', ')}
              </span>
            </div>

            {/* Quality Setting Selector */}
            <div className="flex items-center gap-1.5 bg-[#071324] px-2 py-1 rounded-[4px] border border-[#1E3557] text-xs">
              <span className="text-[11px] text-slate-400 font-formal-mono uppercase flex items-center gap-1">
                <Sliders className="w-3 h-3 text-[#1FA5A0]" /> Quality:
              </span>
              {(['high', 'medium', 'low'] as RenderQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => onChangeQuality(q)}
                  className={`px-2 py-0.5 rounded-[3px] text-[11px] font-formal-mono uppercase transition-colors ${
                    quality === q
                      ? 'bg-[#1E3557] text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Zone Picker, Fluid Picker, Speed, and Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            
            {/* Zone Picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase font-formal-mono tracking-wider text-slate-400 font-medium">
                Drip tray zone:
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#071324] p-1 rounded-[4px] border border-[#1E3557]">
                <button
                  onClick={() => onSelectZone('z1')}
                  className={`py-1.5 px-2 rounded-[3px] text-xs font-formal-mono transition-all ${
                    selectedZone === 'z1'
                      ? 'bg-[#1FA5A0] text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Zone 1 (Z1)
                </button>
                <button
                  onClick={() => onSelectZone('z2')}
                  className={`py-1.5 px-2 rounded-[3px] text-xs font-formal-mono transition-all ${
                    selectedZone === 'z2'
                      ? 'bg-[#1FA5A0] text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Zone 2 (Z2)
                </button>
              </div>
            </div>

            {/* Fluid Picker (strictly matching machine specification) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase font-formal-mono tracking-wider text-slate-400 font-medium">
                Fluid type:
              </label>
              <div className="flex gap-1 bg-[#071324] p-1 rounded-[4px] border border-[#1E3557]">
                {allowedFluids.includes('coolant') && (
                  <button
                    onClick={() => onSelectFluid('coolant')}
                    className={`flex-1 py-1.5 px-2 rounded-[3px] text-xs font-formal-sans font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedFluid === 'coolant'
                        ? 'bg-[#1FA5A0] text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#1FA5A0] border border-slate-950" />
                    Coolant (thin)
                  </button>
                )}
                {allowedFluids.includes('oil') && (
                  <button
                    onClick={() => onSelectFluid('oil')}
                    className={`flex-1 py-1.5 px-2 rounded-[3px] text-xs font-formal-sans font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedFluid === 'oil'
                        ? 'bg-[#D98200] text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#D98200] border border-slate-950" />
                    Oil (glossy)
                  </button>
                )}
              </div>
            </div>

            {/* Leak Speed */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase font-formal-mono tracking-wider text-slate-400 font-medium">
                Discharge rate:
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#071324] p-1 rounded-[4px] border border-[#1E3557]">
                {(['drip', 'seep', 'flood'] as LeakSpeed[]).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onChangeSpeed(spd)}
                    className={`py-1.5 px-1 rounded-[3px] text-xs font-formal-mono capitalize transition-all ${
                      leakSpeed === spd
                        ? 'bg-[#1E3557] text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2 pt-2 sm:pt-4">
              <button
                onClick={onToggleLeak}
                className={`flex-1 py-2 px-3 rounded-[4px] text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] ${
                  isLeaking
                    ? 'bg-[#C0392B] hover:bg-[#a93226] text-white'
                    : 'bg-[#2E8540] hover:bg-[#256e34] text-white'
                }`}
              >
                {isLeaking ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" /> Stop leak
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Start leak
                  </>
                )}
              </button>

              <button
                onClick={onResetAll}
                className="p-2 rounded-[4px] bg-[#071324] hover:bg-[#11294d] border border-[#1E3557] text-slate-300 hover:text-white transition-colors"
                title="Reset all puddles and simulation states"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={onToggleSound}
                className="p-2 rounded-[4px] bg-[#071324] hover:bg-[#11294d] border border-[#1E3557] text-slate-300 hover:text-white transition-colors"
                title={soundEnabled ? 'Mute audio alerts' : 'Unmute audio alerts'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[#1FA5A0]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
