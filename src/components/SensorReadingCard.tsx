import React from 'react';
import { ZoneTelemetry } from '../types/dripwatch';
import { Activity, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface SensorReadingCardProps {
  telemetry: ZoneTelemetry;
  isLeaking: boolean;
}

export const SensorReadingCard: React.FC<SensorReadingCardProps> = ({
  telemetry,
  isLeaking
}) => {
  const isElectrodes = telemetry.sensorSignalType === 'electrodes';
  const threshold = telemetry.sensorThreshold;
  const history = telemetry.signalHistory || [];

  // SVG chart dimensions
  const svgWidth = 260;
  const svgHeight = 110;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 22;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Min and max values for Y scale
  const yMin = isElectrodes ? 0 : 0;
  const yMax = isElectrodes ? 1000 : 100;

  const getY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const normalized = (clamped - yMin) / (yMax - yMin);
    return padTop + chartH * (1 - normalized);
  };

  const maxT = history.length > 0 ? Math.max(...history.map(h => h.time), 3.5) : 3.5;
  const getX = (t: number) => {
    return padLeft + (t / maxT) * chartW;
  };

  // Generate SVG path string
  let pathD = '';
  if (history.length > 0) {
    pathD = history.reduce((acc, pt, i) => {
      const x = getX(pt.time);
      const y = getY(pt.value);
      return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  } else {
    const defaultY = getY(isElectrodes ? 2.5 : 98.4);
    pathD = `M ${padLeft} ${defaultY} L ${padLeft + chartW} ${defaultY}`;
  }

  const thresholdY = getY(threshold);

  // Milestone points coordinates
  const p1 = telemetry.liquidReachedTime !== null ? {
    x: getX(telemetry.liquidReachedTime),
    y: getY(isElectrodes ? 200 : 80),
    label: '1. Reached'
  } : null;

  const p2 = telemetry.thresholdCrossedTime !== null ? {
    x: getX(telemetry.thresholdCrossedTime),
    y: thresholdY,
    label: '2. Crossed'
  } : null;

  const p3 = telemetry.confirmedTime !== null ? {
    x: getX(telemetry.confirmedTime),
    y: getY(isElectrodes ? 720 : 22),
    label: '3. Confirmed'
  } : null;

  return (
    <section className="bg-[#11294D] border border-[#1E3557] rounded-[6px] p-3 space-y-2.5 shadow-md font-formal-sans text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#1E3557]">
        <span className="text-[11px] font-formal-mono font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#1FA5A0]" />
          Sensor reading
        </span>
        <span className="text-[10px] font-formal-mono px-1.5 py-0.5 rounded bg-[#071324] border border-[#1E3557] text-[#1FA5A0]">
          {isElectrodes ? 'AC Conductance' : 'Optical IR'}
        </span>
      </div>

      {/* Numerical Metrics Bar */}
      <div className="grid grid-cols-2 gap-2 text-xs font-formal-mono">
        <div className="bg-[#071324] border border-[#1E3557] rounded-[4px] p-1.5 flex flex-col">
          <span className="text-[9px] text-slate-400 uppercase">Live Signal</span>
          <span className="font-bold text-white text-xs truncate">
            {telemetry.sensorSignal} <span className="text-[10px] text-slate-400 font-normal">{telemetry.signalUnit}</span>
          </span>
        </div>
        <div className="bg-[#071324] border border-[#1E3557] rounded-[4px] p-1.5 flex flex-col">
          <span className="text-[9px] text-slate-400 uppercase">Detection Time</span>
          <span className="font-bold text-[#1FA5A0] text-xs">
            {telemetry.detectionTimeSeconds !== null ? `${telemetry.detectionTimeSeconds} s` : isLeaking ? 'Measuring...' : '--'}
          </span>
        </div>
      </div>

      {/* Live SVG Line Chart */}
      <div className="relative bg-[#071324] border border-[#1E3557] rounded-[4px] p-1 overflow-hidden">
        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-auto block select-none"
          aria-label="Sensor signal live chart"
        >
          {/* Grid lines */}
          <line x1={padLeft} y1={padTop} x2={padLeft + chartW} y2={padTop} stroke="#1E3557" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1={padLeft} y1={padTop + chartH / 2} x2={padLeft + chartW} y2={padTop + chartH / 2} stroke="#1E3557" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1={padLeft} y1={padTop + chartH} x2={padLeft + chartW} y2={padTop + chartH} stroke="#1E3557" strokeWidth="0.5" />

          {/* Y Axis Labels */}
          <text x={padLeft - 4} y={padTop + 4} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
            {isElectrodes ? '1k' : '100%'}
          </text>
          <text x={padLeft - 4} y={padTop + chartH + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
            0
          </text>

          {/* Dashed Threshold Line */}
          <line
            x1={padLeft}
            y1={thresholdY}
            x2={padLeft + chartW}
            y2={thresholdY}
            stroke="#eab308"
            strokeWidth="1.2"
            strokeDasharray="4,3"
          />
          <text
            x={padLeft + chartW - 2}
            y={thresholdY - 3}
            textAnchor="end"
            fill="#eab308"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            Threshold ({threshold} {telemetry.signalUnit})
          </text>

          {/* Signal Curve */}
          <path
            d={pathD}
            fill="none"
            stroke={isElectrodes ? '#22d3ee' : '#f59e0b'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Marked Point 1: Liquid reaches sensor */}
          {p1 && (
            <g>
              <circle cx={p1.x} cy={p1.y} r="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
              <text x={Math.min(p1.x, padLeft + chartW - 40)} y={Math.max(p1.y - 6, padTop + 8)} fill="#38bdf8" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
                1. Reached
              </text>
            </g>
          )}

          {/* Marked Point 2: Threshold crossed */}
          {p2 && (
            <g>
              <circle cx={p2.x} cy={p2.y} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
              <text x={Math.min(p2.x, padLeft + chartW - 40)} y={Math.max(p2.y - 6, padTop + 8)} fill="#f59e0b" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
                2. Crossed
              </text>
            </g>
          )}

          {/* Marked Point 3: Confirmed after 3 readings */}
          {p3 && (
            <g>
              <circle cx={p3.x} cy={p3.y} r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="1.2" />
              <text x={Math.min(p3.x, padLeft + chartW - 55)} y={p3.y > padTop + 20 ? p3.y - 6 : p3.y + 12} fill="#4ade80" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">
                3. Confirmed
              </text>
            </g>
          )}

          {/* Time axis */}
          <text x={padLeft} y={svgHeight - 4} fill="#64748b" fontSize="8" fontFamily="monospace">0s</text>
          <text x={padLeft + chartW / 2} y={svgHeight - 4} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Time (s)</text>
          <text x={padLeft + chartW} y={svgHeight - 4} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">{maxT.toFixed(0)}s</text>
        </svg>
      </div>

      {/* Sequence Checklist */}
      <div className="space-y-1 text-[10px] font-formal-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className={`w-2 h-2 rounded-full shrink-0 ${p1 ? 'bg-[#38bdf8]' : 'bg-slate-600'}`} />
          <span className={p1 ? 'text-white font-medium' : 'text-slate-400'}>
            Liquid reaches sensor: {telemetry.liquidReachedTime !== null ? `${telemetry.liquidReachedTime} s` : 'Waiting'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className={`w-2 h-2 rounded-full shrink-0 ${p2 ? 'bg-[#eab308]' : 'bg-slate-600'}`} />
          <span className={p2 ? 'text-white font-medium' : 'text-slate-400'}>
            Threshold crossed: {telemetry.thresholdCrossedTime !== null ? `${telemetry.thresholdCrossedTime} s` : 'Waiting'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className={`w-2 h-2 rounded-full shrink-0 ${p3 ? 'bg-[#22c55e]' : 'bg-slate-600'}`} />
          <span className={p3 ? 'text-white font-medium' : 'text-slate-400'}>
            Confirmed after 3 readings: {telemetry.confirmedTime !== null ? `${telemetry.confirmedTime} s` : 'Waiting'}
          </span>
        </div>
      </div>

      {/* Mandatory Label */}
      <div className="pt-1.5 border-t border-[#1E3557] flex items-center justify-between text-[10px] text-slate-400 italic">
        <span>Illustrative signal, not measured data.</span>
      </div>

    </section>
  );
};
