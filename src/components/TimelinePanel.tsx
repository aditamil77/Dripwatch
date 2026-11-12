import React from 'react';
import { 
  MachineId, 
  SeverityRating, 
  TimelineEvent, 
  ZoneTelemetry 
} from '../types/dripwatch';
import { MACHINES_CONFIG } from '../utils/iotLogic';
import { 
  Clock, 
  X, 
  CheckCircle2, 
  Circle
} from 'lucide-react';

interface TimelinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMachine: MachineId;
  timeline: TimelineEvent[];
  severity: SeverityRating;
  telemetry: Record<MachineId, Record<'z1' | 'z2', ZoneTelemetry>>;
  isLeaking: boolean;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  isOpen,
  onClose,
  selectedMachine,
  timeline,
  severity,
  telemetry
}) => {
  if (!isOpen) return null;

  const machineCfg = MACHINES_CONFIG[selectedMachine];
  const mTel = telemetry[selectedMachine];

  return (
    <div className="fixed top-28 right-4 z-30 w-96 max-w-[94vw] bg-[#0B1F3A] border border-[#1E3557] rounded-[6px] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-slate-100 font-formal-sans">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1E3557] bg-[#071324]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[4px] bg-[#D98200]/15 border border-[#D98200]/30 text-[#D98200]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Detection latency and timeline</h3>
            <p className="text-[11px] text-slate-400 font-formal-mono">
              Target asset: <strong className="text-sky-300">{machineCfg.name}</strong>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-[4px] hover:bg-[#11294d] transition-colors"
          title="Close timeline panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        
        {/* Machine Zone Mini Dashboard Chips */}
        <div className="bg-[#071324] p-3 rounded-[4px] border border-[#1E3557]">
          <div className="text-[11px] font-formal-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Zone telemetry status</span>
            <span className="text-[10px] text-[#2E8540]">Node {selectedMachine.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded-[4px] border text-xs font-formal-mono flex items-center justify-between ${
              mTel.z1.status === 'alert'
                ? 'bg-[#C0392B]/20 border-[#C0392B] text-rose-300 font-semibold'
                : 'bg-[#0B1F3A] border-[#1E3557] text-slate-300'
            }`}>
              <span>{selectedMachine.toUpperCase()}-Z1</span>
              <span className={mTel.z1.status === 'alert' ? 'text-[#C0392B] font-bold' : 'text-[#2E8540]'}>
                {mTel.z1.status === 'alert' ? 'ALERT' : 'DRY'}
              </span>
            </div>
            <div className={`p-2 rounded-[4px] border text-xs font-formal-mono flex items-center justify-between ${
              mTel.z2.status === 'alert'
                ? 'bg-[#C0392B]/20 border-[#C0392B] text-rose-300 font-semibold'
                : 'bg-[#0B1F3A] border-[#1E3557] text-slate-300'
            }`}>
              <span>{selectedMachine.toUpperCase()}-Z2</span>
              <span className={mTel.z2.status === 'alert' ? 'text-[#C0392B] font-bold' : 'text-[#2E8540]'}>
                {mTel.z2.status === 'alert' ? 'ALERT' : 'DRY'}
              </span>
            </div>
          </div>
        </div>

        {/* Severity Evaluation Card */}
        <div className="bg-[#071324] p-3 rounded-[4px] border border-[#1E3557] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-formal-mono text-slate-400 uppercase">Calculated severity rating</div>
            <div className="text-xs text-slate-400 font-formal-mono">Rate from pad 1 to pad 3 arrival</div>
          </div>
          <div className={`px-2.5 py-1 rounded-[4px] text-xs font-formal-mono font-semibold ${
            severity === 'Flood' ? 'bg-[#C0392B] text-white' :
            severity === 'Seep' ? 'bg-[#D98200] text-slate-950' :
            severity === 'Drip' ? 'bg-[#1FA5A0] text-slate-950' :
            'bg-[#1E3557] text-slate-400'
          }`}>
            {severity !== 'None' ? severity : 'Monitoring'}
          </div>
        </div>

        {/* Chronological Milestone Events */}
        <div className="space-y-3 relative pl-2">
          <div className="absolute top-2 bottom-2 left-4 w-0.5 bg-[#1E3557]" />

          {timeline.map((evt) => {
            const isDone = evt.isCompleted;

            return (
              <div key={evt.id} className="relative flex items-start gap-3 text-xs">
                <div className={`z-10 p-0.5 rounded-full ${isDone ? 'bg-[#2E8540] text-white' : 'bg-[#071324] text-slate-600 border border-[#1E3557]'}`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </div>

                <div className={`flex-1 p-2.5 rounded-[4px] border ${
                  isDone ? 'bg-[#071324] border-[#1E3557]' : 'bg-[#071324]/50 border-[#1E3557]/40 opacity-60'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-200">{evt.title}</span>
                    <span className="font-formal-mono text-[11px] text-[#1FA5A0]">
                      {evt.timeSeconds !== null ? `+${evt.timeSeconds.toFixed(1)} s` : '--'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{evt.description}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Mandatory Evaluator Note in Footer */}
      <div className="p-3 bg-[#071324] border-t border-[#1E3557] text-[11px] text-slate-400 italic">
        Illustrative simulation of the planned prototype. Times and ratings are not measured results.
      </div>

    </div>
  );
};
