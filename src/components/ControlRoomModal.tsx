import React from 'react';
import { 
  IncidentRecord, 
  MachineId, 
  ZoneId, 
  ZoneTelemetry 
} from '../types/dripwatch';
import { MACHINES_CONFIG } from '../utils/iotLogic';
import { 
  Monitor, 
  X, 
  Radio, 
  ShieldCheck, 
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

interface ControlRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: IncidentRecord[];
  telemetry: Record<MachineId, Record<ZoneId, ZoneTelemetry>>;
  onAcknowledgeIncident: (incidentId: string) => void;
  onAssignIncident: (incidentId: string) => void;
  onCloseIncident: (incidentId: string) => void;
  onSelectMachine: (machineId: MachineId) => void;
}

export const ControlRoomModal: React.FC<ControlRoomModalProps> = ({
  isOpen,
  onClose,
  incidents,
  telemetry,
  onAcknowledgeIncident,
  onAssignIncident,
  onCloseIncident,
  onSelectMachine,
}) => {
  if (!isOpen) return null;

  const activeAlertCount = incidents.filter(i => i.status !== 'closed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 animate-in fade-in duration-150 font-formal-sans">
      <div className="bg-[#0B1F3A] border border-[#1E3557] rounded-[6px] max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E3557] bg-[#071324] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[4px] bg-[#1FA5A0]/15 border border-[#1FA5A0]/30 text-[#1FA5A0]">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-semibold text-white tracking-tight font-formal-title">Plant SCADA control room console</h2>
                <span className="px-2 py-0.5 rounded-[3px] text-[11px] font-formal-mono font-medium bg-[#2E8540]/20 text-[#4ade80] border border-[#2E8540]/30 flex items-center gap-1.5">
                  <Radio className="w-3 h-3" /> MQTT gateway online
                </span>
              </div>
              <p className="text-xs text-slate-400">South mezzanine terminal • Secondary containment monitoring</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Active incidents</div>
              <div className={`text-sm font-semibold font-formal-mono ${activeAlertCount > 0 ? 'text-[#C0392B]' : 'text-[#2E8540]'}`}>
                {activeAlertCount} {activeAlertCount === 1 ? 'incident' : 'incidents'}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-[4px] hover:bg-[#11294d] transition-colors"
              title="Close SCADA console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top Section: Top-Down Floor Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1FA5A0]" />
                Machine and basin status map
              </h3>
              <span className="text-xs text-slate-400">Click any machine cell to fly camera</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#071324] p-3 rounded-[6px] border border-[#1E3557]">
              {(['m1', 'm2', 'm3', 'm4'] as MachineId[]).map(mId => {
                const cfg = MACHINES_CONFIG[mId];
                const mTel = telemetry[mId];
                const z1Alert = mTel.z1.status === 'alert';
                const z2Alert = mTel.z2.status === 'alert';
                const machineHasAlert = z1Alert || z2Alert;

                return (
                  <div
                    key={mId}
                    onClick={() => {
                      onSelectMachine(mId);
                      onClose();
                    }}
                    className={`p-3 rounded-[4px] border cursor-pointer transition-all ${
                      machineHasAlert 
                        ? 'bg-[#3b1212]/30 border-[#C0392B] hover:border-red-400' 
                        : 'bg-[#0B1F3A] border-[#1E3557] hover:border-[#1FA5A0]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-[3px] text-xs font-semibold font-formal-mono ${
                          machineHasAlert ? 'bg-[#C0392B] text-white' : 'bg-[#1E3557] text-[#1FA5A0]'
                        }`}>
                          {mId.toUpperCase()}
                        </span>
                        <span className="font-medium text-sm text-slate-100">{cfg.name}</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1 mb-2 font-formal-mono">{cfg.description}</p>

                    {/* Zone Chips */}
                    <div className="grid grid-cols-2 gap-2 font-formal-mono text-xs">
                      <div className={`px-2 py-1.5 rounded-[3px] border flex items-center justify-between ${
                        z1Alert 
                          ? 'bg-[#C0392B]/20 border-[#C0392B] text-rose-300 font-bold' 
                          : 'bg-[#071324] border-[#1E3557] text-[#2E8540]'
                      }`}>
                        <span>{mId.toUpperCase()}-Z1</span>
                        <span>{z1Alert ? 'ALERT' : 'DRY'}</span>
                      </div>
                      <div className={`px-2 py-1.5 rounded-[3px] border flex items-center justify-between ${
                        z2Alert 
                          ? 'bg-[#C0392B]/20 border-[#C0392B] text-rose-300 font-bold' 
                          : 'bg-[#071324] border-[#1E3557] text-[#2E8540]'
                      }`}>
                        <span>{mId.toUpperCase()}-Z2</span>
                        <span>{z2Alert ? 'ALERT' : 'DRY'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Live Event Log & Incident Lifecycle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2E8540]" />
                Incident management workflow (Detected → Acknowledged → Assigned → Closed)
              </h3>
              <span className="text-xs text-slate-400 font-formal-mono">SLA escalation: 20.0 s</span>
            </div>

            {incidents.length === 0 ? (
              <div className="p-8 text-center bg-[#071324] rounded-[6px] border border-[#1E3557] text-slate-400 text-sm">
                <ShieldCheck className="w-8 h-8 text-[#2E8540] mx-auto mb-2" />
                No active or historical incidents recorded. All secondary containment trays are dry and nominal.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[6px] border border-[#1E3557] bg-[#071324]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-formal-mono text-[11px] border-b border-[#1E3557]">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Asset and basin</th>
                      <th className="py-2.5 px-3">Fluid</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Response time</th>
                      <th className="py-2.5 px-3">Closure time</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Workflow actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E3557]/60 font-formal-mono">
                    {incidents.map((inc) => {
                      const dateStr = new Date(inc.detectedAt).toLocaleTimeString();

                      return (
                        <tr key={inc.id} className={inc.isEscalated ? 'bg-[#3b1212]/30' : 'hover:bg-[#0B1F3A]/40'}>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">{dateStr}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-medium text-white">
                            {inc.fullZoneId.toUpperCase()} ({MACHINES_CONFIG[inc.machineId].name})
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium ${
                              inc.fluid === 'oil' ? 'bg-[#D98200]/20 text-[#D98200]' : 'bg-[#1FA5A0]/20 text-[#1FA5A0]'
                            }`}>
                              {inc.fluid === 'oil' ? 'Hydraulic oil' : 'Water coolant'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-[3px] text-[11px] font-semibold ${
                              inc.severity === 'Flood' ? 'bg-[#C0392B] text-white' :
                              inc.severity === 'Seep' ? 'bg-[#D98200]/20 text-[#D98200]' :
                              'bg-[#1FA5A0]/20 text-[#1FA5A0]'
                            }`}>
                              {inc.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                            {inc.responseTimeSeconds !== null ? `${inc.responseTimeSeconds.toFixed(1)} s` : '--'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                            {inc.closureTimeSeconds !== null ? `${inc.closureTimeSeconds.toFixed(1)} s` : '--'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-[3px] text-[11px] font-semibold uppercase ${
                                inc.status === 'detected' ? 'bg-[#C0392B]/20 text-rose-300 border border-[#C0392B]/50' :
                                inc.status === 'acknowledged' ? 'bg-[#D98200]/20 text-amber-300 border border-[#D98200]/40' :
                                inc.status === 'assigned' ? 'bg-[#1FA5A0]/20 text-teal-300 border border-[#1FA5A0]/40' :
                                'bg-[#2E8540]/20 text-[#4ade80] border border-[#2E8540]/40'
                              }`}>
                                {inc.status}
                              </span>
                              {inc.isEscalated && (
                                <span className="px-1.5 py-0.5 rounded-[3px] bg-[#C0392B] text-white text-[10px] font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> SLA BREACH
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-right space-x-1.5 font-formal-sans">
                            {inc.status === 'detected' && (
                              <button
                                onClick={() => onAcknowledgeIncident(inc.id)}
                                className="px-2.5 py-1 rounded-[4px] bg-[#D98200] hover:bg-[#b86e00] text-slate-950 font-semibold text-[11px] transition-colors"
                              >
                                Acknowledge
                              </button>
                            )}

                            {inc.status === 'acknowledged' && (
                              <button
                                onClick={() => onAssignIncident(inc.id)}
                                className="px-2.5 py-1 rounded-[4px] bg-[#1FA5A0] hover:bg-[#188480] text-slate-950 font-semibold text-[11px] transition-colors"
                              >
                                Assign technician
                              </button>
                            )}

                            {inc.status === 'assigned' && (
                              <button
                                onClick={() => onCloseIncident(inc.id)}
                                className="px-2.5 py-1 rounded-[4px] bg-[#2E8540] hover:bg-[#256e34] text-white font-semibold text-[11px] transition-colors"
                              >
                                Close incident
                              </button>
                            )}

                            {inc.status === 'closed' && (
                              <span className="text-[11px] text-slate-500 italic">Resolved</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Mandatory Note */}
        <div className="px-6 py-3 border-t border-[#1E3557] bg-[#071324] flex items-center justify-between text-xs text-slate-400">
          <span className="italic">Illustrative simulation of the planned prototype. Times and ratings are not measured results.</span>
          <div className="flex items-center gap-2 font-formal-mono text-[11px]">
            <span>Gateway: <strong className="text-slate-300">192.168.10.1</strong></span>
            <span>•</span>
            <span>Broker: <strong className="text-slate-300">mqtts://dripwatch.internal:8883</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
