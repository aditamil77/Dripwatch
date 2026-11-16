import React from 'react';
import { 
  MachineId, 
  ZoneId, 
  FluidType, 
  LeakSpeed, 
  ZoneTelemetry,
  MachineNodeState
} from '../types/dripwatch';
import { 
  Sliders, 
  Play, 
  RotateCcw, 
  Droplet,
  ChevronRight,
  ChevronLeft,
  Activity,
  Cpu
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
  nodeStates?: Record<MachineId, MachineNodeState>;
  selectedMachine: MachineId;
  onSelectMachine: (machineId: MachineId) => void;
  selectedZone: ZoneId;
  onSelectZone: (zone: ZoneId) => void;
  selectedFluid: FluidType;
  onSelectFluid?: (fluid: FluidType) => void;
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
  nodeStates,
  selectedMachine,
  onSelectMachine,
  selectedZone,
  selectedFluid,
  onSelectFluid,
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
  const currentNode = nodeStates?.[selectedMachine];
  const activeCompartmentAlerts = nodeStates
    ? (Object.values(nodeStates) as MachineNodeState[]).filter(n => n.compartmentAlertActive)
    : [];

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
                <option value="m1">Machine 01 – Hydraulic Press</option>
                <option value="m2">Machine 02 – CNC Milling Center</option>
                <option value="m3">Machine 03 – Heavy Lathe</option>
                <option value="m4">Machine 04 – Hydraulic Power Unit</option>
              </select>
            </div>

            {/* Fluid Type Selector (Interactive Oil vs Coolant) */}
            <div className="space-y-0.5">
              <label className="text-[9.5px] text-slate-400 font-formal-mono uppercase tracking-wider block">
                Fluid Type
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectFluid && onSelectFluid('oil')}
                  aria-label="Oil (Amber)"
                  className={`py-1.5 px-2 rounded-[4px] text-[11px] font-formal-mono border transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    selectedFluid === 'oil'
                      ? 'bg-[#D98200] text-slate-950 font-bold border-[#D98200] shadow-sm'
                      : 'bg-[#071324] text-slate-300 border-[#1E3557] hover:border-[#D98200]/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#D98200] border border-slate-950 inline-block shrink-0" />
                  <span>Oil</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectFluid && onSelectFluid('coolant')}
                  aria-label="Coolant (Cyan)"
                  className={`py-1.5 px-2 rounded-[4px] text-[11px] font-formal-mono border transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    selectedFluid === 'coolant'
                      ? 'bg-[#1FA5A0] text-slate-950 font-bold border-[#1FA5A0] shadow-sm'
                      : 'bg-[#071324] text-slate-300 border-[#1E3557] hover:border-[#1FA5A0]/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#06b6d4] border border-slate-950 inline-block shrink-0" />
                  <span>Coolant</span>
                </button>
              </div>
            </div>

            {/* Leak Velocity: Exactly Two Modes (Light Flow & Heavy Flow) */}
            <div className="space-y-0.5">
              <label className="text-[9.5px] text-slate-400 font-formal-mono uppercase tracking-wider block">
                Leak Velocity
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: 'light_flow', label: 'Light Flow' },
                  { id: 'heavy_flow', label: 'Heavy Flow' }
                ] as { id: LeakSpeed; label: string }[]).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeSpeed(opt.id)}
                    aria-pressed={leakSpeed === opt.id}
                    className={`py-1.5 px-2 rounded-[4px] text-[11px] font-formal-mono border transition-all cursor-pointer text-center whitespace-nowrap ${
                      leakSpeed === opt.id
                        ? 'bg-[#D98200] text-slate-950 font-bold border-[#D98200] shadow-sm'
                        : 'bg-[#071324] text-slate-300 border-[#1E3557] hover:border-[#D98200]/40'
                    }`}
                  >
                    {opt.label}
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

        {/* 2. Signal & Detection Pipeline Card */}
        {currentNode && (
          <section
            data-testid="signal-pipeline-card"
            className="bg-[#11294D] border border-[#1E3557] rounded-[6px] p-2.5 space-y-1.5 shadow-md"
          >
            <div className="flex items-center justify-between pb-1 border-b border-[#1E3557]">
              <span className="text-[10.5px] font-formal-mono font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#1FA5A0]" />
                Detection Pipeline ({selectedMachine.toUpperCase()})
              </span>
              <span
                className={`text-[9.5px] font-formal-mono font-bold px-1.5 py-0.5 rounded-[3px] ${
                  currentNode.nodeDisplayStatus === 'LEAK DETECTED'
                    ? 'bg-[#C0392B] text-white'
                    : currentNode.nodeDisplayStatus === 'PROCESSING'
                      ? 'bg-[#D98200] text-slate-950'
                      : 'bg-[#2E8540]/25 text-emerald-300 border border-[#2E8540]/50'
                }`}
              >
                {currentNode.nodeDisplayStatus}
              </span>
            </div>

            <div className="space-y-1 text-[10px] font-formal-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Electrode:</span>
                <span className={currentNode.activeElectrode ? 'text-white font-semibold' : 'text-slate-500'}>
                  {currentNode.activeElectrode
                    ? `${currentNode.activeElectrode.toUpperCase()} ELECTRODE`
                    : 'No contact'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Local Node/CPU:</span>
                <span
                  className={
                    currentNode.nodeDisplayStatus === 'LEAK DETECTED'
                      ? 'text-rose-400 font-bold'
                      : currentNode.nodeDisplayStatus === 'PROCESSING'
                        ? 'text-amber-300 font-bold'
                        : 'text-emerald-400'
                  }
                >
                  {currentNode.nodeDisplayStatus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">General Comp. Box:</span>
                <span
                  className={
                    activeCompartmentAlerts.length > 0
                      ? 'text-rose-400 font-bold'
                      : currentNode.pipelineStage === 'transmitting'
                        ? 'text-cyan-300 font-bold'
                        : 'text-emerald-400'
                  }
                >
                  {activeCompartmentAlerts.length > 0
                    ? `ALERT (${activeCompartmentAlerts.map(a => `${a.machineId.toUpperCase()} ${a.detectedFluid?.toUpperCase()}`).join(', ')})`
                    : currentNode.pipelineStage === 'transmitting'
                      ? 'TRANSMITTING...'
                      : 'NORMAL'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 3. Sensor Reading Card */}
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
