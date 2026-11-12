import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThreeCanvas } from './components/ThreeCanvas';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar, DetectionEventLog } from './components/RightSidebar';
import { GuidedTourBanner } from './components/GuidedTourBanner';
import { InsideSensorModal } from './components/InsideSensorModal';
import { EvaluatorGuideModal } from './components/EvaluatorGuideModal';
import { DripWatchScene } from './three/DripWatchScene';
import { 
  MachineId, 
  ZoneId, 
  FluidType, 
  LeakSpeed, 
  ZoneTelemetry, 
  MachineNodeState, 
  TechnicalViews, 
  MachineLeakState,
  RenderQuality
} from './types/dripwatch';
import { 
  evaluateZone, 
  deriveMachineNodeState, 
  getLeakSpeedConfig,
  isFluidAllowedForMachine,
  getDefaultFluidForMachine,
  PAD_DISTANCES
} from './utils/iotLogic';
import { GUIDED_TOUR_STEPS } from './utils/guidedTour';
import { soundEngine } from './utils/audioSynth';
import { 
  Volume2, 
  VolumeX, 
  HelpCircle,
  Radio,
  Sliders,
  Activity,
  Compass,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  X
} from 'lucide-react';

const INITIAL_MACHINES: MachineId[] = ['m1', 'm2', 'm3', 'm4'];

export default function App() {
  const sceneRef = useRef<DripWatchScene | null>(null);

  // Selected Machine and Active Controls
  const [selectedMachine, setSelectedMachine] = useState<MachineId>('m2');
  const [selectedZone, setSelectedZone] = useState<ZoneId>('z1');
  const [selectedFluid, setSelectedFluid] = useState<FluidType>('coolant');
  const [leakSpeed, setLeakSpeed] = useState<LeakSpeed>('drip');
  
  // Fixed graphics setting with silent automatic fallback in Three.js (No visible buttons)
  const quality: RenderQuality = 'medium';

  // Collapsible Sidebars State
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Mobile Drawer State ('none' | 'views' | 'simulation')
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'views' | 'simulation'>('none');

  // Independent Leak State per Machine (supports concurrent leaks)
  const [machineLeaks, setMachineLeaks] = useState<Record<MachineId, MachineLeakState>>({
    m1: { machineId: 'm1', activeZone: 'none', fluidType: 'oil', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
    m2: { machineId: 'm2', activeZone: 'none', fluidType: 'coolant', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
    m3: { machineId: 'm3', activeZone: 'none', fluidType: 'coolant', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
    m4: { machineId: 'm4', activeZone: 'none', fluidType: 'oil', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
  });

  // Detection Event Logs (recording time of detection and location of leak)
  const [eventLogs, setEventLogs] = useState<DetectionEventLog[]>([]);

  // Technical Views State
  const [technicalViews, setTechnicalViews] = useState<TechnicalViews>({
    xrayMachine: false,
    openController: false,
    signalPaths: false,
    insideSensor: false,
  });

  // Modals & Inspection
  const [isInsideSensorModalOpen, setIsInsideSensorModalOpen] = useState(false);
  const [isEvaluatorGuideOpen, setIsEvaluatorGuideOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Guided Tour State
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [isTourPaused, setIsTourPaused] = useState(false);
  const [tourStepElapsed, setTourStepElapsed] = useState(0);

  // Handle machine selection change & enforce fluid restrictions
  const handleSelectMachine = useCallback((mId: MachineId) => {
    setSelectedMachine(mId);
    if (!isFluidAllowedForMachine(mId, selectedFluid)) {
      setSelectedFluid(getDefaultFluidForMachine(mId));
    }
  }, [selectedFluid]);

  // Handle sound toggle
  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      soundEngine.setEnabled(next);
      return next;
    });
  }, []);

  // Sync TechnicalViews with Three.js scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTechnicalViews(technicalViews);
    }
  }, [technicalViews]);

  const handleToggleTechnicalView = useCallback((key: keyof TechnicalViews) => {
    soundEngine.playClickSound();
    if (key === 'insideSensor') {
      setIsInsideSensorModalOpen(true);
    } else {
      setTechnicalViews(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  }, []);

  // Camera Flying Helpers
  const handleFlyToFloor = useCallback(() => {
    soundEngine.playClickSound();
    sceneRef.current?.flyToFloorView();
  }, []);

  const handleFlyToMachine = useCallback((id: MachineId) => {
    soundEngine.playClickSound();
    sceneRef.current?.flyToMachine(id);
  }, []);

  const handleFollowLeak = useCallback(() => {
    soundEngine.playClickSound();
    const leakingMId = INITIAL_MACHINES.find(id => machineLeaks[id].isLeaking);
    if (leakingMId) {
      const activeZ = machineLeaks[leakingMId].activeZone === 'none' ? 'z1' : machineLeaks[leakingMId].activeZone;
      sceneRef.current?.flyToLeak(leakingMId, activeZ);
      setSelectedMachine(leakingMId);
      setSelectedZone(activeZ);
    }
  }, [machineLeaks]);

  // Toggle Leak for Currently Selected Machine
  const handleToggleLeak = useCallback(() => {
    soundEngine.playClickSound();

    setMachineLeaks(prev => {
      const cur = prev[selectedMachine];
      const nextIsLeaking = !cur.isLeaking;

      if (nextIsLeaking) {
        const startTime = Date.now();
        const timeStr = new Date().toLocaleTimeString();

        // Focus 3D camera smoothly on the leakage outlet, droplets, and the two detection electrodes
        sceneRef.current?.flyToLeakSimulation(selectedMachine, selectedZone);

        // Add event record for leak inception
        const newLog: DetectionEventLog = {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          fullZoneId: `${selectedMachine.toUpperCase()}-${selectedZone.toUpperCase()}`,
          description: `Leak Initiated (${leakSpeed})`,
          status: 'active',
          severity: leakSpeed.toUpperCase()
        };
        setEventLogs(logs => [newLog, ...logs.slice(0, 19)]);

        return {
          ...prev,
          [selectedMachine]: {
            ...cur,
            activeZone: selectedZone,
            fluidType: selectedFluid,
            leakSpeed: leakSpeed,
            isLeaking: true,
            leakStartTime: startTime,
            pad1Time: null,
            pad3Time: null
          }
        };
      } else {
        const timeStr = new Date().toLocaleTimeString();
        const stopLog: DetectionEventLog = {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          fullZoneId: `${selectedMachine.toUpperCase()}-${selectedZone.toUpperCase()}`,
          description: 'Leak Flow Stopped',
          status: 'cleared'
        };
        setEventLogs(logs => [stopLog, ...logs.slice(0, 19)]);

        return {
          ...prev,
          [selectedMachine]: {
            ...cur,
            isLeaking: false
          }
        };
      }
    });
  }, [selectedMachine, selectedZone, selectedFluid, leakSpeed]);

  // Reset All Machines, Puddles, and Event Records
  const handleResetAll = useCallback(() => {
    soundEngine.playClickSound();
    sceneRef.current?.resetSimulation();
    setMachineLeaks({
      m1: { machineId: 'm1', activeZone: 'none', fluidType: 'oil', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
      m2: { machineId: 'm2', activeZone: 'none', fluidType: 'coolant', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
      m3: { machineId: 'm3', activeZone: 'none', fluidType: 'coolant', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
      m4: { machineId: 'm4', activeZone: 'none', fluidType: 'oil', leakSpeed: 'drip', isLeaking: false, leakStartTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
    });
    const timeStr = new Date().toLocaleTimeString();
    setEventLogs([{
      id: `reset-${Date.now()}`,
      timestamp: timeStr,
      fullZoneId: 'ALL CELLS',
      description: 'System Reset - Trays Dry',
      status: 'cleared'
    }]);
  }, []);

  // Guided Demo Tour Automation Controller
  const startGuidedTour = useCallback(() => {
    soundEngine.playClickSound();
    handleResetAll();
    setIsTourActive(true);
    setTourStepIndex(0);
    setIsTourPaused(false);
    setTourStepElapsed(0);
    sceneRef.current?.flyToFloorView();
  }, [handleResetAll]);

  // Execute Guided Tour actions on step change
  // Execute Guided Tour actions on step change with tailored dynamic camera views
  useEffect(() => {
    if (!isTourActive) return;

    try {
      const step = GUIDED_TOUR_STEPS[tourStepIndex];
      if (!step) return;

      // Requirement #3: Distinct, tailored camera viewpoint for every guided demo step
      sceneRef.current?.flyToDemoStep(step.stepIndex, step.focusMachine !== 'all' ? step.focusMachine : 'm2');

      if (step.focusMachine !== 'all') {
        setSelectedMachine(step.focusMachine);
      }

      if (step.action === 'introduce_machine') {
        setSelectedMachine('m2');
      } else if (step.action === 'show_outlet') {
        setSelectedMachine('m2');
        setSelectedZone('z1');
        setSelectedFluid('coolant');
      } else if (step.action === 'drip_liquid') {
        setSelectedMachine('m2');
        setSelectedZone('z1');
        setSelectedFluid('coolant');
        setLeakSpeed('seep');
        setMachineLeaks(prev => ({
          ...prev,
          m2: {
            ...prev.m2,
            activeZone: 'z1',
            fluidType: 'coolant',
            leakSpeed: 'seep',
            isLeaking: true,
            leakStartTime: Date.now(),
            pad1Time: null,
            pad3Time: null
          }
        }));
      } else if (step.action === 'probe_contact') {
        setSelectedMachine('m2');
        setSelectedZone('z1');
        setSelectedFluid('coolant');
      } else if (step.action === 'signal_transmit') {
        setSelectedMachine('m2');
        setSelectedZone('z1');
      } else if (step.action === 'controller_active') {
        setSelectedMachine('m2');
        setSelectedZone('z1');
      } else if (step.action === 'alert_display') {
        const timeStr = new Date().toLocaleTimeString();
        setEventLogs(logs => [
          {
            id: `tour-${Date.now()}`,
            timestamp: timeStr,
            fullZoneId: 'M2-Z1',
            description: 'Incident Latched: M2-Z1 COOLANT LEAK DETECTED',
            status: 'active',
            severity: 'SEEP'
          },
          ...logs
        ]);
      }
    } catch (err) {
      console.error('Demo step error, skipping:', err);
    }
  }, [isTourActive, tourStepIndex]);

  // Guided Tour Progress Clock with ~1s pause between steps
  useEffect(() => {
    if (!isTourActive || isTourPaused) return;

    const timer = setInterval(() => {
      const step = GUIDED_TOUR_STEPS[tourStepIndex];
      if (!step) return;

      const totalWithPause = step.durationSeconds + 1.0;

      setTourStepElapsed(prev => {
        const next = prev + 0.2;
        if (next >= totalWithPause) {
          if (tourStepIndex < GUIDED_TOUR_STEPS.length - 1) {
            setTourStepIndex(cur => cur + 1);
            return 0;
          } else {
            setIsTourActive(false);
            return 0;
          }
        }
        return next;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [isTourActive, isTourPaused, tourStepIndex]);

  // Physics & Puddle Accumulation Simulation Loop (60 Hz)
  useEffect(() => {
    let lastTime = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      INITIAL_MACHINES.forEach(mId => {
        const leak = machineLeaks[mId];
        if (!leak.isLeaking || leak.activeZone === 'none') return;

        const config = getLeakSpeedConfig(leak.leakSpeed);
        const zId = leak.activeZone;

        // Spawn droplets
        if (Math.random() < config.dropsPerSec * dt) {
          sceneRef.current?.spawnDroplet(mId, zId, leak.fluidType);
          soundEngine.playDripSound(leak.fluidType);
        }

        // Puddle accumulation
        setMachineLeaks(prev => {
          const m = prev[mId];
          const currentVol = m.puddles[zId];
          const newVol = currentVol + config.volIncrementPerSec * dt;

          const radius = Math.min(newVol * 0.12, 1.4);
          let newPad1Time = m.pad1Time;
          let newPad3Time = m.pad3Time;

          if (radius >= PAD_DISTANCES[0] && newPad1Time === null) {
            newPad1Time = (Date.now() - (m.leakStartTime || Date.now())) / 1000;
          }
          if (radius >= PAD_DISTANCES[2] && newPad3Time === null) {
            newPad3Time = (Date.now() - (m.leakStartTime || Date.now())) / 1000;
          }

          return {
            ...prev,
            [mId]: {
              ...m,
              pad1Time: newPad1Time,
              pad3Time: newPad3Time,
              puddles: {
                ...m.puddles,
                [zId]: newVol
              }
            }
          };
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [machineLeaks]);

  // Derive live telemetry for all 4 machines and 8 zones
  const evaluatedTelemetry = React.useMemo(() => {
    const res: Record<MachineId, Record<ZoneId, ZoneTelemetry>> = {} as any;
    INITIAL_MACHINES.forEach(mId => {
      const leak = machineLeaks[mId];
      res[mId] = {
        z1: evaluateZone(mId, 'z1', leak.activeZone === 'z1', leak.fluidType, leak.puddles.z1, leak.leakStartTime),
        z2: evaluateZone(mId, 'z2', leak.activeZone === 'z2', leak.fluidType, leak.puddles.z2, leak.leakStartTime),
      };
    });
    return res;
  }, [machineLeaks]);

  // Derive independent ESP32 node states
  const evaluatedNodeStates = React.useMemo(() => {
    const res: Record<MachineId, MachineNodeState> = {} as any;
    INITIAL_MACHINES.forEach(mId => {
      res[mId] = deriveMachineNodeState(mId, evaluatedTelemetry[mId].z1, evaluatedTelemetry[mId].z2);
    });
    return res;
  }, [evaluatedTelemetry]);

  // Active streams for flood speed
  const activeStreams = React.useMemo(() => {
    const res: Record<MachineId, { isStreaming: boolean; zone: ZoneId; fluid: FluidType }> = {} as any;
    INITIAL_MACHINES.forEach(mId => {
      const leak = machineLeaks[mId];
      res[mId] = {
        isStreaming: leak.isLeaking && leak.leakSpeed === 'flood' && leak.activeZone !== 'none',
        zone: leak.activeZone === 'none' ? 'z1' : leak.activeZone,
        fluid: leak.fluidType
      };
    });
    return res;
  }, [machineLeaks]);

  const hasAnyActiveLeak = Object.values(machineLeaks).some(l => l.isLeaking);

  useEffect(() => {
    const isAnyBuzzerActive = Object.values(evaluatedNodeStates).some(n => n.buzzerActive);
    if (isAnyBuzzerActive && soundEnabled) {
      soundEngine.playBuzzerSound();
    }
  }, [evaluatedNodeStates, soundEnabled]);

  const curStep = GUIDED_TOUR_STEPS[tourStepIndex] || GUIDED_TOUR_STEPS[0];
  const stepProgressPct = Math.min((tourStepElapsed / curStep.durationSeconds) * 100, 100);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#071324] font-formal-sans select-none text-slate-100 flex flex-col">
      
      {/* 1. Top Bar: DRIPWATCH - 3D PROTOTYPE SIMULATION Branding (Requirement #1 & #2) */}
      <header className="h-12 bg-[#0B1F3A] border-b border-[#1E3557] px-3 sm:px-4 flex items-center justify-between shrink-0 z-40 select-none">
        
        {/* Brand & Subtitle: DRIPWATCH / 3D PROTOTYPE SIMULATION */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-[4px] bg-[#1FA5A0]/20 text-[#1FA5A0] border border-[#1FA5A0]/40 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm sm:text-base text-white font-formal-title tracking-wider leading-tight">
              DRIPWATCH
            </h1>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-formal-mono font-medium tracking-wide uppercase leading-tight">
              3D PROTOTYPE SIMULATION
            </span>
          </div>
        </div>

        {/* Repositioned Navigation Buttons: Simulation (Left) & Views & Navigation (Right) */}
        <nav aria-label="Main Navigation" className="flex items-center gap-3 sm:gap-7 lg:gap-10 mx-2">
          {/* 1. Simulation button (moved further toward the left side) */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileDrawer(d => d === 'simulation' ? 'none' : 'simulation');
              } else {
                setIsRightCollapsed(c => !c);
                setTimeout(() => sceneRef.current?.onResize(), 220);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[4px] border text-[11px] sm:text-xs font-formal-mono transition-all cursor-pointer whitespace-nowrap ${
              (mobileDrawer === 'simulation' || (!isRightCollapsed && window.innerWidth >= 1024))
                ? 'bg-[#1FA5A0] text-slate-950 border-[#1FA5A0] font-bold shadow-sm'
                : 'bg-[#071324] text-slate-300 hover:text-white border-[#1E3557] hover:bg-[#11294D]'
            }`}
            title="Toggle Simulation controls"
            aria-label="Simulation"
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>Simulation</span>
          </button>

          {/* 2. Views & Navigation button (moved further toward the right side) */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileDrawer(d => d === 'views' ? 'none' : 'views');
              } else {
                setIsLeftCollapsed(c => !c);
                setTimeout(() => sceneRef.current?.onResize(), 220);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[4px] border text-[11px] sm:text-xs font-formal-mono transition-all cursor-pointer whitespace-nowrap ${
              (mobileDrawer === 'views' || (!isLeftCollapsed && window.innerWidth >= 1024))
                ? 'bg-[#1FA5A0] text-slate-950 border-[#1FA5A0] font-bold shadow-sm'
                : 'bg-[#071324] text-slate-300 hover:text-white border-[#1E3557] hover:bg-[#11294D]'
            }`}
            title="Toggle Views & Navigation controls"
            aria-label="Views & Navigation"
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>Views & Navigation</span>
          </button>
        </nav>

        {/* Right Controls: Guided Demo Controls, Active Leak Badge, Audio, and Guide */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* PRIMARY GUIDED DEMO BUTTON / CONTROLS */}
          {!isTourActive ? (
            <button
              onClick={startGuidedTour}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#1FA5A0] hover:bg-[#188480] text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
              title="Start guided prototype demonstration"
            >
              <Compass className="w-3.5 h-3.5 fill-current" />
              <span>Start guided demo</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-[#071324] p-1 rounded-[4px] border border-[#1FA5A0]">
              <button
                onClick={() => setIsTourPaused(!isTourPaused)}
                className="px-2 py-0.5 rounded-[3px] bg-[#1FA5A0] text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                title={isTourPaused ? "Resume demo" : "Pause demo"}
              >
                {isTourPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                <span>{isTourPaused ? "Resume" : "Pause"}</span>
              </button>
              <button
                onClick={() => {
                  if (tourStepIndex < GUIDED_TOUR_STEPS.length - 1) {
                    setTourStepIndex(tourStepIndex + 1);
                    setTourStepElapsed(0);
                  }
                }}
                className="px-2 py-0.5 rounded-[3px] text-slate-300 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer hover:bg-[#11294D]"
                title="Next step"
              >
                <SkipForward className="w-3 h-3" />
                <span>Next</span>
              </button>
              <button
                onClick={startGuidedTour}
                className="p-1 rounded-[3px] text-slate-300 hover:text-white text-[11px] cursor-pointer hover:bg-[#11294D]"
                title="Restart demo"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsTourActive(false)}
                className="p-1 rounded-[3px] text-slate-300 hover:text-white text-[11px] cursor-pointer hover:bg-[#11294D]"
                title="Skip demo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}


          {/* Audio Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-[4px] bg-[#071324] hover:bg-[#11294D] text-slate-300 border border-[#1E3557] transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            aria-label="Toggle audio"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#2E8540]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Evaluator Guide Modal Trigger */}
          <button
            onClick={() => setIsEvaluatorGuideOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[#071324] hover:bg-[#11294D] text-slate-300 border border-[#1E3557] text-xs font-formal-sans cursor-pointer"
            title="Architecture and evaluation reference"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden xl:inline">Guide</span>
          </button>

        </div>
      </header>

      {/* 2. Main Center Body: Responsive Grid Layout (Desktop: docked sidebars never float over 3D canvas) */}
      <div className="flex flex-1 min-h-0 min-w-0 relative overflow-hidden bg-[#071324]">
        
        {/* Mobile Drawer Backdrop (No backdrop-blur, clean overlay) */}
        {mobileDrawer !== 'none' && (
          <div
            onClick={() => setMobileDrawer('none')}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar (Desktop: docked with width clamp(170px, 15vw, 220px) or 48px rail; Mobile: slide-out drawer) */}
        <div className={`
          lg:relative lg:flex lg:z-10 h-full
          ${mobileDrawer === 'views' ? 'fixed inset-y-0 left-0 z-50 flex max-w-[75%] sm:max-w-[320px]' : 'hidden'}
        `}>
          <LeftSidebar
            views={technicalViews}
            onFlyToFloor={handleFlyToFloor}
            onFlyToMachine={handleFlyToMachine}
            onFollowLeak={handleFollowLeak}
            onToggleInsideSensor={() => setIsInsideSensorModalOpen(true)}
            onToggleOpenNode={() => handleToggleTechnicalView('openController')}
            hasActiveLeak={hasAnyActiveLeak}
            selectedMachine={selectedMachine}
            onSelectMachine={handleSelectMachine}
            isCollapsed={isLeftCollapsed}
            onToggleCollapse={() => {
              setIsLeftCollapsed(c => !c);
              setTimeout(() => sceneRef.current?.onResize(), 220);
            }}
            onCloseMobileDrawer={mobileDrawer === 'views' ? () => setMobileDrawer('none') : undefined}
          />
        </div>

        {/* Center Column: 3D Canvas Area (fills remaining space) + Docked Dashboard Strip below */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative h-full overflow-hidden bg-[#071324]">
          
          {/* 3D WebGL Canvas Area: Resizes automatically when sidebars or dashboard toggle */}
          <main className="flex-1 relative min-w-0 min-h-0 w-full bg-[#071324] overflow-hidden">
            
            {/* Three.js 3D WebGL Canvas */}
            <ThreeCanvas
              telemetry={evaluatedTelemetry}
              nodeStates={evaluatedNodeStates}
              activeStreams={activeStreams}
              quality={quality}
              sceneRef={sceneRef}
            />

            {/* Guided Tour Caption Bar Overlay Docked at Bottom of Canvas */}
            <GuidedTourBanner
              isActive={isTourActive}
              currentStepIndex={tourStepIndex}
              isPaused={isTourPaused}
              stepProgressPercent={stepProgressPct}
              onTogglePause={() => setIsTourPaused(!isTourPaused)}
              onNextStep={() => {
                if (tourStepIndex < GUIDED_TOUR_STEPS.length - 1) {
                  setTourStepIndex(tourStepIndex + 1);
                  setTourStepElapsed(0);
                }
              }}
              onPrevStep={() => {
                if (tourStepIndex > 0) {
                  setTourStepIndex(tourStepIndex - 1);
                  setTourStepElapsed(0);
                }
              }}
              onRestart={startGuidedTour}
              onExitTour={() => setIsTourActive(false)}
            />

            {/* Bottom-Left 3D Visualization Label: Requirement #3 */}
            <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3.5 z-20 pointer-events-none select-none">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-formal-mono font-medium text-slate-300/90 bg-[#071324]/85 backdrop-blur-sm px-2.5 py-1 rounded-[4px] border border-[#1E3557]/80 shadow-md inline-block">
                ILLUSTRATIVE SIMULATION OF THE FINAL DEMONSTRATIVE PROTOTYPE
              </span>
            </div>

          </main>

        </div>

        {/* Right Sidebar (Desktop: docked with width clamp(220px, 20vw, 300px) or 48px rail; Mobile: slide-out drawer) */}
        <div className={`
          lg:relative lg:flex lg:z-10 h-full
          ${mobileDrawer === 'simulation' ? 'fixed inset-y-0 right-0 z-50 flex max-w-[75%] sm:max-w-[320px]' : 'hidden'}
        `}>
          <RightSidebar
            telemetry={evaluatedTelemetry}
            selectedMachine={selectedMachine}
            onSelectMachine={(mId) => {
              setSelectedMachine(mId);
              sceneRef.current?.flyToMachine(mId);
            }}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            selectedFluid={selectedFluid}
            leakSpeed={leakSpeed}
            onChangeSpeed={setLeakSpeed}
            isLeaking={machineLeaks[selectedMachine].isLeaking}
            onToggleLeak={handleToggleLeak}
            onResetAll={handleResetAll}
            eventLogs={eventLogs}
            isCollapsed={isRightCollapsed}
            onToggleCollapse={() => {
              setIsRightCollapsed(c => !c);
              setTimeout(() => sceneRef.current?.onResize(), 220);
            }}
            onCloseMobileDrawer={mobileDrawer === 'simulation' ? () => setMobileDrawer('none') : undefined}
          />
        </div>

      </div>

      {/* 3. Additional Modals */}

      {/* Inside Sensor Cutaway Modal */}
      <InsideSensorModal
        isOpen={isInsideSensorModalOpen}
        onClose={() => setIsInsideSensorModalOpen(false)}
        fluidSimulated={selectedFluid}
      />

      {/* Evaluator Guide Modal */}
      <EvaluatorGuideModal
        isOpen={isEvaluatorGuideOpen}
        onClose={() => setIsEvaluatorGuideOpen(false)}
        onStartGuidedTour={startGuidedTour}
      />

    </div>
  );
}
