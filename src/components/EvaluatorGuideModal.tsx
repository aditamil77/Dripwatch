import React from 'react';
import { 
  HelpCircle, 
  X, 
  Layers, 
  Monitor, 
  CheckCircle2
} from 'lucide-react';

interface EvaluatorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGuidedTour: () => void;
}

export const EvaluatorGuideModal: React.FC<EvaluatorGuideModalProps> = ({
  isOpen,
  onClose,
  onStartGuidedTour
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 font-formal-sans">
      <div className="bg-[#0B1F3A] border border-[#1E3557] rounded-[6px] max-w-2xl w-full p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E3557]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[4px] bg-[#1FA5A0]/15 border border-[#1FA5A0]/30 text-[#1FA5A0]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white font-formal-title">System architecture and evaluator reference</h2>
              <p className="text-xs text-slate-400">Technical overview of the DripWatch secondary containment prototype</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-slate-400 hover:text-white hover:bg-[#11294d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 my-5 text-xs sm:text-sm text-slate-300">
          
          <div className="bg-[#071324] p-3.5 rounded-[4px] border border-[#1E3557]">
            <h3 className="font-semibold text-white mb-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1FA5A0]" />
              System concept
            </h3>
            <p className="leading-relaxed text-slate-300 text-xs">
              DripWatch is a continuous secondary containment monitoring system for industrial machine shops. Dedicated edge microcontrollers (ESP32) and physical sensing arrays mounted within machine drip trays detect hydraulic oil and water-glycol coolant leaks, transmitting wireless telemetry to a central SCADA gateway before fluids escape containment boundaries.
            </p>
          </div>

          {/* Color Legend */}
          <div>
            <h3 className="font-semibold text-white mb-2 text-xs uppercase font-formal-mono tracking-wider text-slate-400">
              Visual status and fluid legend
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-formal-mono text-xs">
              <div className="p-2.5 rounded-[4px] bg-[#071324] border border-[#2E8540]/40 flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#2E8540] shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Green</div>
                  <div className="text-[10px] text-slate-400">Normal / Dry basin</div>
                </div>
              </div>

              <div className="p-2.5 rounded-[4px] bg-[#071324] border border-[#C0392B]/40 flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#C0392B] shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Red</div>
                  <div className="text-[10px] text-slate-400">Leak alert active</div>
                </div>
              </div>

              <div className="p-2.5 rounded-[4px] bg-[#071324] border border-[#D98200]/40 flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#D98200] shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Amber</div>
                  <div className="text-[10px] text-slate-400">Hydraulic oil</div>
                </div>
              </div>

              <div className="p-2.5 rounded-[4px] bg-[#071324] border border-[#1FA5A0]/40 flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-[#1FA5A0] shrink-0" />
                <div>
                  <div className="font-semibold text-white text-xs">Teal</div>
                  <div className="text-[10px] text-slate-400">Water coolant</div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Evaluation Scenarios */}
          <div>
            <h3 className="font-semibold text-white mb-2 text-xs uppercase font-formal-mono tracking-wider text-slate-400">
              Evaluation procedures
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-[4px] bg-[#071324] border border-[#1E3557] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#1FA5A0] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">1. Multi-machine independence:</strong> Select M1 Press and start an oil leak. Observe that Node M1 turns red, while Node M2 through M4 remain normal and green.
                </div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#071324] border border-[#1E3557] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#1FA5A0] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">2. Dual simultaneous leaks:</strong> Select M2 CNC Mill and start a concurrent coolant leak. Notice the multi-machine indicator and independent telemetry.
                </div>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#071324] border border-[#1E3557] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#1FA5A0] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">3. Detection time and location latching:</strong> Observe the leak simulation card on the right sidebar and watch the detection timeline record the exact detection timestamp, machine cell, and containment zone.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1E3557] flex items-center justify-between text-xs text-slate-400">
          <span className="italic">Illustrative simulation of the planned prototype. Times and ratings are not measured results.</span>
          <button
            onClick={() => {
              onClose();
              onStartGuidedTour();
            }}
            className="px-4 py-2 rounded-[4px] bg-[#1FA5A0] hover:bg-[#188480] text-slate-950 font-semibold transition-colors"
          >
            Start guided demonstration
          </button>
        </div>

      </div>
    </div>
  );
};
