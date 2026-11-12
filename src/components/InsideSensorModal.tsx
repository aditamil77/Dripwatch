import React from 'react';
import { X, Zap } from 'lucide-react';

interface InsideSensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fluidSimulated: 'coolant' | 'oil';
}

export const InsideSensorModal: React.FC<InsideSensorModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none font-formal-sans">
      <div className="bg-[#0B1F3A] border border-[#1E3557] rounded-[6px] max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative pointer-events-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E3557]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[4px] bg-[#1FA5A0]/15 border border-[#1FA5A0]/30 text-[#1FA5A0]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white font-formal-title">Inside sensor: Transduction physics and operating principles</h3>
              <p className="text-xs text-slate-400 font-formal-mono">AC conductive bridging vs. optical infrared total internal reflection (TIR)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-[4px] hover:bg-[#11294d] transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Sensor Diagrams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5">
          
          {/* Left: AC-Driven Coolant Electrodes */}
          <div className="p-4 rounded-[4px] bg-[#071324] border border-[#1E3557] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1FA5A0]" />
                <h4 className="font-semibold text-sm text-[#1FA5A0]">Coolant: AC impedance electrodes</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Two copper electrode pins (4 mm gap) excited by high-frequency 10 kHz alternating current, eliminating electrochemical plating and sacrificial corrosion.
              </p>

              <div className="h-32 rounded-[4px] bg-[#0B1F3A] border border-[#1E3557] p-3 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="flex items-end gap-10 h-16">
                  <div className="w-3 h-14 bg-[#b87333] rounded-t-[2px]" />
                  <div className="w-3 h-14 bg-[#b87333] rounded-t-[2px]" />
                </div>
                {/* Fluid bridge */}
                <div className="absolute bottom-3 w-28 h-6 bg-[#1FA5A0]/40 rounded-[2px] border-t border-[#1FA5A0] flex items-center justify-center">
                  <span className="text-[10px] text-teal-200 font-formal-mono font-semibold">
                    CONDUCTIVE BRIDGE CLOSED
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] font-formal-mono text-slate-300 bg-[#0B1F3A] p-2 rounded-[3px] border border-[#1E3557]">
              <div>Dry impedance: <strong className="text-slate-400">&lt; 5 µS/cm</strong></div>
              <div>Coolant contact: <strong className="text-[#1FA5A0]">&gt; 520 µS/cm (Triggered)</strong></div>
            </div>
          </div>

          {/* Right: Optical IR Prism Reflectance */}
          <div className="p-4 rounded-[4px] bg-[#071324] border border-[#1E3557] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D98200]" />
                <h4 className="font-semibold text-sm text-[#D98200]">Oil: Optical TIR prism sensor</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                940 nm infrared emitter and photodiode in an optical acrylic cone. Dry air boundary creates total internal reflection; fluid index collapse refracts beam outward.
              </p>

              <div className="h-32 rounded-[4px] bg-[#0B1F3A] border border-[#1E3557] p-3 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-16 h-12 border-2 border-sky-400/40 rotate-45 flex items-center justify-center bg-sky-950/20" />
                <div className="absolute inset-x-8 bottom-3 h-5 bg-[#8a4500]/60 border-t border-[#D98200] rounded-[2px] flex items-center justify-center">
                  <span className="text-[10px] text-amber-200 font-formal-mono font-semibold">
                    OIL FILM (TIR COLLAPSED)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] font-formal-mono text-slate-300 bg-[#0B1F3A] p-2 rounded-[3px] border border-[#1E3557]">
              <div>Dry reflection: <strong className="text-slate-400">98.4%</strong></div>
              <div>Oil film reflection: <strong className="text-[#D98200]">18.2% (Beam attenuated)</strong></div>
            </div>
          </div>

        </div>

        {/* Note */}
        <div className="p-3 bg-[#071324] border border-[#1E3557] rounded-[4px] text-xs text-slate-400 leading-relaxed">
          <p>
            Capillary spread pads surround the active sensing heads. When fluid reaches the pad, liquid bridges the capillary gap, triggering the ESP32 analog-to-digital converter threshold within 3 consecutive samples (300 ms).
          </p>
        </div>

      </div>
    </div>
  );
};
