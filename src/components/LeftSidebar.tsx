import React from 'react';
import { 
  MachineId, 
  TechnicalViews 
} from '../types/dripwatch';
import { MACHINES_CONFIG } from '../utils/iotLogic';
import { 
  Eye, 
  Layers, 
  Cpu, 
  Crosshair, 
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Radio
} from 'lucide-react';

interface LeftSidebarProps {
  views: TechnicalViews;
  onFlyToFloor: () => void;
  onFlyToMachine: (id: MachineId) => void;
  onFollowLeak: () => void;
  onToggleInsideSensor: () => void;
  onToggleOpenNode: () => void;
  hasActiveLeak: boolean;
  selectedMachine: MachineId;
  onSelectMachine: (id: MachineId) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobileDrawer?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  views,
  onFlyToFloor,
  onFlyToMachine,
  onFollowLeak,
  onToggleInsideSensor,
  onToggleOpenNode,
  hasActiveLeak,
  selectedMachine,
  onSelectMachine,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobileDrawer
}) => {
  // Narrow icon rail when collapsed
  if (isCollapsed) {
    return (
      <aside 
        className="w-12 h-full bg-[#0B1F3A] border-r border-[#1E3557] flex flex-col items-center py-3 select-none z-30 transition-all duration-200"
        aria-label="Views sidebar collapsed rail"
      >
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-[4px] bg-[#11294D] hover:bg-[#183a6c] text-[#1FA5A0] border border-[#1E3557] cursor-pointer mb-4"
          title="Expand views sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <button 
            onClick={onFlyToFloor}
            className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Floor view"
          >
            <Maximize2 className="w-4 h-4 text-[#1FA5A0]" />
          </button>
          <button 
            onClick={() => onFlyToMachine(selectedMachine)}
            className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Machine close-up"
          >
            <Crosshair className="w-4 h-4 text-[#1FA5A0]" />
          </button>
          <button 
            onClick={onToggleInsideSensor}
            className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Inside sensor cutaway"
          >
            <Layers className="w-4 h-4 text-sky-400" />
          </button>
          <button 
            onClick={onToggleOpenNode}
            className="p-1.5 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Open node"
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
          </button>
          <button 
            onClick={onFollowLeak}
            disabled={!hasActiveLeak}
            className={`p-1.5 rounded cursor-pointer ${hasActiveLeak ? 'text-rose-400 animate-pulse' : 'text-slate-600'}`}
            title="Follow the leak"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside 
      className="w-[clamp(170px,15vw,220px)] h-full flex flex-col bg-[#0B1F3A] border-r border-[#1E3557] overflow-y-auto font-formal-sans text-slate-100 select-none shadow-2xl z-30 relative transition-all duration-200"
      aria-label="Views and camera navigation"
    >
      {/* Edge Collapse Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-4 z-40 w-6 h-6 rounded-full bg-[#11294D] border border-[#1E3557] text-[#1FA5A0] hover:text-white items-center justify-center shadow cursor-pointer"
          title="Collapse sidebar to icon rail"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Drawer Mobile Close Button */}
      {onCloseMobileDrawer && (
        <div className="flex items-center justify-between p-2.5 border-b border-[#1E3557] lg:hidden bg-[#071324]">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-formal-mono">Views & Navigation</span>
          <button
            onClick={onCloseMobileDrawer}
            className="px-2 py-1 rounded bg-[#11294D] text-slate-300 hover:text-white border border-[#1E3557] text-xs font-formal-mono cursor-pointer"
            aria-label="Close drawer"
          >
            Done
          </button>
        </div>
      )}

      <div className="p-2.5 sm:p-3 space-y-3.5 flex-1 flex flex-col justify-between">
        
        {/* Top Group: Views */}
        <div className="space-y-3">
          <section className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#1E3557]">
              <span className="text-[11px] font-formal-mono font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#1FA5A0]" />
                Views
              </span>
              <span className="text-[10px] text-slate-400 font-formal-mono">Camera</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Floor View */}
              <button
                onClick={onFlyToFloor}
                className="flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs font-medium bg-[#11294D] hover:bg-[#183a6c] text-slate-200 border border-[#1E3557] transition-all cursor-pointer text-left shadow-sm"
                title="Overview of all 4 machines and shop floor"
              >
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-3.5 h-3.5 text-[#1FA5A0] shrink-0" />
                  <span className="font-semibold text-xs">Floor view</span>
                </div>
                <span className="text-[9px] text-slate-400 font-formal-mono">Overview</span>
              </button>

              {/* Machine Close-Up Cycle */}
              <div className="bg-[#11294D] border border-[#1E3557] rounded-[4px] p-2 space-y-1.5">
                <div className="text-[9.5px] text-slate-400 font-formal-mono uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-[#1FA5A0]" />
                    Machine close-up
                  </span>
                  <span className="text-[9px] text-[#1FA5A0] font-semibold">{selectedMachine.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['m1', 'm2', 'm3', 'm4'] as MachineId[]).map(id => (
                    <button
                      key={id}
                      onClick={() => {
                        onSelectMachine(id);
                        onFlyToMachine(id);
                      }}
                      className={`py-1 rounded-[3px] text-xs font-formal-mono border transition-all cursor-pointer text-center ${
                        selectedMachine === id
                          ? 'bg-[#1FA5A0] text-slate-950 border-[#1FA5A0] font-bold shadow-sm'
                          : 'bg-[#071324] text-slate-300 border-[#1E3557] hover:border-[#1FA5A0]/50'
                      }`}
                      title={`Fly camera to ${MACHINES_CONFIG[id].name}`}
                    >
                      {id.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inside Sensor Cutaway */}
              <button
                onClick={onToggleInsideSensor}
                className="flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs font-medium bg-[#11294D] hover:bg-[#183a6c] text-slate-200 border border-[#1E3557] transition-all cursor-pointer text-left shadow-sm"
                title="Inspect electrode conductivity & optical IR reflectance cutaway"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="font-semibold text-xs">Inside sensor</span>
                </div>
                <span className="text-[9px] text-sky-300 font-formal-mono px-1 py-0.2 rounded bg-[#071324] border border-[#1E3557]">Cutaway</span>
              </button>

              {/* Open Node PCB */}
              <button
                onClick={onToggleOpenNode}
                className={`flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs font-medium border transition-all cursor-pointer text-left shadow-sm ${
                  views.openController
                    ? 'bg-[#1E3557] text-[#1FA5A0] border-[#1FA5A0]'
                    : 'bg-[#11294D] hover:bg-[#183a6c] text-slate-200 border-[#1E3557]'
                }`}
                title="Remove enclosure lid to reveal ESP32 MCU, ADC, and antenna PCB"
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-xs">Open node</span>
                </div>
                <span className={`text-[9px] font-formal-mono px-1 py-0.2 rounded border ${
                  views.openController 
                    ? 'text-[#1FA5A0] bg-[#071324] border-[#1FA5A0] font-bold' 
                    : 'text-slate-400 bg-[#071324] border-[#1E3557]'
                }`}>
                  {views.openController ? 'Open' : 'Closed'}
                </span>
              </button>

              {/* Follow the Leak */}
              <button
                onClick={onFollowLeak}
                disabled={!hasActiveLeak}
                className={`flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs font-medium border transition-all text-left shadow-sm ${
                  hasActiveLeak
                    ? 'bg-[#C0392B]/20 text-rose-300 border-[#C0392B]/60 hover:bg-[#C0392B]/30 cursor-pointer animate-pulse'
                    : 'bg-[#11294D]/40 text-slate-500 border-[#1E3557] cursor-not-allowed opacity-60'
                }`}
                title={hasActiveLeak ? 'Focus camera smoothly close to the drip point and touched sensor' : 'No leak currently active'}
              >
                <div className="flex items-center gap-2">
                  <Compass className={`w-3.5 h-3.5 ${hasActiveLeak ? 'text-rose-400 animate-spin' : 'text-slate-500'} shrink-0`} />
                  <span className="font-semibold text-xs">Follow the leak</span>
                </div>
                {hasActiveLeak ? (
                  <span className="w-2 h-2 rounded-full bg-[#C0392B] animate-ping" />
                ) : (
                  <span className="text-[9px] text-slate-500 font-formal-mono">Idle</span>
                )}
              </button>
            </div>
          </section>

          {/* Continuous Zone Monitoring Architecture Note */}
          <section className="bg-[#071324] border border-[#1E3557] rounded-[4px] p-2 space-y-1">
            <div className="text-[9.5px] font-formal-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#1FA5A0]" />
              Continuous Monitoring
            </div>
            <p className="text-[10px] text-slate-300 leading-normal">
              Dual-zone containment basins with dedicated edge sensor arrays.
            </p>
          </section>
        </div>

        {/* Bottom Group: System Legend */}
        <section className="pt-2 border-t border-[#1E3557] space-y-1.5">
          <span className="text-[9px] font-formal-mono text-slate-400 uppercase tracking-wider block">
            System Legend
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-formal-mono">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#071324] border border-[#1E3557]">
              <span className="w-2 h-2 rounded-full bg-[#2E8540] shrink-0" />
              <span className="text-slate-300">Normal</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#071324] border border-[#1E3557]">
              <span className="w-2 h-2 rounded-full bg-[#C0392B] shrink-0" />
              <span className="text-slate-300">Leak</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#071324] border border-[#1E3557]">
              <span className="w-2 h-2 rounded-full bg-[#D98200] shrink-0" />
              <span className="text-slate-300">Oil</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#071324] border border-[#1E3557]">
              <span className="w-2 h-2 rounded-full bg-[#1FA5A0] shrink-0" />
              <span className="text-slate-300">Coolant</span>
            </div>
          </div>
        </section>

      </div>
    </aside>
  );
};
