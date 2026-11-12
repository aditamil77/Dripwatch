import React from 'react';
import { 
  MachineId, 
  ZoneId, 
  FluidType, 
  LeakSpeed, 
  ZoneTelemetry 
} from '../types/dripwatch';
import { 
  Sliders, 
  Play, 
  RotateCcw, 
  Droplet,
  ChevronRight,
  ChevronLeft,
  Activity,
  Layers
} from 'lucide-react';
import { SensorReadingCard } from './SensorReadingCard';

export interface DetectionEventLog {
  id: string;
  timestamp: string;
  fullZoneId: string;
  description: string;
  status: 'active' | 'cleared';
  severity?: string;
}

interface RightSidebarProps {
  telemetry: Record<MachineId, Record<ZoneId, ZoneTelemetry>>;
  selectedMachine: MachineId;
  onSelectMachine: (machineId: MachineId) => void;
  selectedZone: ZoneId;
  onSelectZone: (zone: ZoneId) => void;
  selectedFluid: FluidType;
  leakSpeed: LeakSpeed;
  onChangeSpeed: (speed: LeakSpeed) => void;
  isLeaking: boolean;
  onToggleLeak: () => void;
  onResetAll: () => void;
  eventLogs: DetectionEventLog[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobileDrawer?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  telemetry,
  selectedMachine,
  onSelectMachine,
  selectedZone,
  onSelectZone,
  selectedFluid,
  leakSpeed,
  onChangeSpeed,
  isLeaking,
  onToggleLeak,
  onResetAll,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobileDrawer
}) => {
  const currentTelemetry = telemetry[selectedMachine]?.[selectedZone];

  // Narrow icon rail when collapsed
  if (isCollapsed) {
    return (
      <aside 
        className="w-12 h-full bg-[#0B1F3A] border-l border-[#1E3557] flex flex-col items-center py-3 select-none z-30 transition-all duration-200"
        aria-label="Simulation sidebar collapsed rail"
      >
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-[4px] bg-[#11294D] hover:bg-[#183a6c] text-[#1FA5A0] border border-[#1E3557] cursor-pointer mb-4"
          title="Expand leak simulation and sensor reading sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <div 
            onClick={onToggleCollapse} 
            className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Leak simulation"
          >
            <Sliders className="w-4 h-4 text-[#1FA5A0]" />
          </div>
          <div 
            onClick={onToggleCollapse} 
            className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Sensor reading chart"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          {isLeaking && (
            <div className="w-2.5 h-2.5 rounded-full bg-[#C0392B] animate-ping mt-2" title="Leak active" />
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className="w-[clamp(220px,20vw,300px)] h-full flex flex-col bg-[#0B1F3A] border-l border-[#1E3557] overflow-y-auto font-formal-sans text-slate-100 select-none shadow-2xl z-30 relative transition-all duration-200"
      aria-label="Plant monitoring and leak simulation controls"
    >
      {/* Edge Collapse Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -left-3 top-4 z-40 w-6 h-6 rounded-full bg-[#11294D] border border-[#1E3557] text-[#1FA5A0] hover:text-white items-center justify-center shadow cursor-pointer"
          title="Collapse sidebar to icon rail"
          aria-label="Collapse sidebar"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Mobile Header with Close */}
      {onCloseMobileDrawer && (
        <div className="flex items-center justify-between p-2.5 border-b border-[#1E3557] lg:hidden bg-[#071324]">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-formal-mono">Simulation & Sensors</span>
          <button
            onClick={onCloseMobileDrawer}
            className="px-2 py-1 rounded bg-[#11294D] text-slate-300 hover:text-white border border-[#1E3557] text-xs font-formal-mono cursor-pointer"
            aria-label="Close drawer"
          >
            Done
          </button>
        </div>
      )}

      <div className="p-2.5 sm:p-3 space-y-3 flex-1">
        
        {/* 1. Leak Simulation Card (Prompt #1 & #10) */}
        <section className="space-y-1.5">
          <div className="flex items-center justify-between pb-1 border-b border-[#1E3557]">
            <span className="text-[11px] font-formal-mono font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#1FA5A0]" />
              Leak simulation
            </span>
            <span className="text-[10px] text-[#1FA5A0] font-formal-mono font-semibold">Active Control</span>
          </div>

          <div className="bg-[#11294D] border border-[#1E3557] rounded-[6px] p-2.5 space-y-2 shadow-md">
            {/* Target Machine */}
            <div className="space-y-0.5">
              <label className="text-[9.5px] text-slate-400 font-formal-mono uppercase tracking-wider block">
                Target Machine
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => onSelectMachine(e.target.value as MachineId)}
                className="w-full bg-[#071324] border border-[#1E3557] rounded-[4px] px-2 py-1 text-xs text-white font-formal-sans focus:outline-none focus:border-[#1FA5A0] cursor-pointer"
              >
                <option value="m1">M1 Hydraulic Press (Oil)</option>
                <option value="m2">M2 CNC Milling (Coolant)</option>
                <option value="m3">M3 Lathe (Coolant/Oil)</option>
                <option value="m4">M4 HPU Station (Oil)</option>
              </select>
            </div>

            {/* Tray Containment Zone */}
            <div className="space-y-0.5">
              <label className="text-[9.5px] text-slate-400 font-formal-mono uppercase tracking-wider block">
                Tray Zone
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onSelectZone('z1')}
                  className={`py-1 rounded-[4px] text-xs font-formal-mono border transition-all cursor-pointer ${
                    selectedZone === 'z1'
                      ? 'bg-[#1FA5A0] text-slate-950 font-bold border-[#1FA5A0] shadow-sm'
                      : 'bg-[#071324] text-slate-300 border-[#1E3557] hover:border-[#1FA5A0]/40'
                  }`}
                >
                  Zone 1
                </button>
                <button
                  onClick={() => onSelectZone('z2')}
                  className={`py-1 rounded-[4px] text-xs font-formal-mono border transition-all cursor-pointer ${
                    selectedZone === 'z2'
                      ? 'bg-[#1FA5A0] text-slate-950 font-bold border-[#1FA5A0] shadow-sm'
                      : 'bg-[#071324] text-slate-300 border-[#1E3557] hover:border-[#1FA5A0]/40'
                  }`}
                >
                  Zone 2
                </button>
              </div>
            </div>

            {/* Fluid Type Badge */}
            <div className="flex items-center justify-between text-xs py-1 px-2 rounded-[4px] bg-[#071324] border border-[#1E3557]">
              <span className="text-[10px] text-slate-400 font-formal-mono">Fluid Type</span>
              <span className={`font-semibold font-formal-mono uppercase text-[10px] px-1.5 py-0.2 rounded ${
                selectedFluid === 'oil' 
                  ? 'bg-[#D98200]/20 text-[#D98200] border border-[#D98200]/40' 
                  : 'bg-[#1FA5A0]/20 text-[#1FA5A0] border border-[#1FA5A0]/40'
              }`}>
                {selectedFluid === 'oil' ? 'Oil (Amber)' : 'Coolant (Teal)'}
              </span>
            </div>

            {/* Leak Velocity */}
            <div className="space-y-0.5">
              <label className="text-[9.5px] text-slate-400 font-formal-mono uppercase tracking-wider block">
                Leak Velocity
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['drip', 'seep', 'flood'] as LeakSpeed[]).map(speed => (
                  <button
                    key={speed}
                    onClick={() => onChangeSpeed(speed)}
                    className={`py-1 rounded-[4px] text-xs font-formal-mono capitalize border transition-all cursor-pointer text-center ${
                      leakSpeed === speed
                        ? 'bg-[#D98200] text-slate-950 font-bold border-[#D98200] shadow-sm'
                        : 'bg-[#071324] text-slate-300 border-[#1E3557] hover:border-[#D98200]/40'
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Start leak / Reset */}
            <div className="space-y-1.5 pt-0.5">
              <button
                onClick={onToggleLeak}
                className={`w-full py-2 px-2.5 rounded-[4px] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                  isLeaking
                    ? 'bg-[#C0392B] hover:bg-[#a93226] text-white animate-pulse'
                    : 'bg-[#1FA5A0] hover:bg-[#188480] text-slate-950 font-bold'
                }`}
              >
                {isLeaking ? (
                  <>
                    <Droplet className="w-3.5 h-3.5 fill-current" />
                    <span>Stop leak ({selectedMachine.toUpperCase()})</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start leak ({selectedMachine.toUpperCase()})</span>
                  </>
                )}
              </button>

              <button
                onClick={onResetAll}
                className="w-full py-1.5 px-2.5 rounded-[4px] bg-[#071324] hover:bg-[#152e50] text-slate-300 border border-[#1E3557] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Clear all active leaks, reset trays and clear event queue"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset all</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. Sensor Reading Card (Prompt A.4: Live line chart, threshold line, 3 points marked, detection time) */}
        {currentTelemetry && (
          <SensorReadingCard
            telemetry={currentTelemetry}
            isLeaking={isLeaking}
          />
        )}

      </div>
    </aside>
  );
};
