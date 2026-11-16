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
  calculatePuddleRadius,
  ELECTRODE_CONTACT_RADIUS,
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

const createInitialLeaks = (): Record<MachineId, MachineLeakState> => ({
  m1: { machineId: 'm1', activeZone: 'none', fluidType: 'oil', leakSpeed: 'light_flow', isLeaking: false, leakStartTime: null, contactTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
  m2: { machineId: 'm2', activeZone: 'none', fluidType: 'coolant', leakSpeed: 'light_flow', isLeaking: false, leakStartTime: null, contactTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
  m3: { machineId: 'm3', activeZone: 'none', fluidType: 'coolant', leakSpeed: 'light_flow', isLeaking: false, leakStartTime: null, contactTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
  m4: { machineId: 'm4', activeZone: 'none', fluidType: 'oil', leakSpeed: 'light_flow', isLeaking: false, leakStartTime: null, contactTime: null, pad1Time: null, pad3Time: null, puddles: { z1: 0, z2: 0 } },
});

export default function App() {
  const sceneRef = useRef<DripWatchScene | null>(null);

  // Selected Machine and Active Controls
  const [selectedMachine, setSelectedMachine] = useState<MachineId>('m2');
  const [selectedZone, setSelectedZone] = useState<ZoneId>('z1');
  const [selectedFluid, setSelectedFluid] = useState<FluidType>('coolant');
  const [leakSpeed, setLeakSpeed] = useState<LeakSpeed>('light_flow');
  
  // Fixed graphics setting with silent automatic fallback in Three.js (No visible buttons)
  const quality: RenderQuality = 'medium';

  // Collapsible Sidebars State
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Mobile Drawer State ('none' | 'views' | 'simulation')
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'views' | 'simulation'>('none');

  // Independent Leak State per Machine (supports concurrent leaks)
  const [machineLeaks, setMachineLeaks] = useState<Record<MachineId, MachineLeakState>>(createInitialLeaks);

  // Reactive wall clock tick driving Wire -> Node/CPU -> General Compartment transitions after physical contact
  const [pipelineNowMs, setPipelineNowMs] = useState<number>(() => Date.now());

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

  // Dynamic 6-View Guided Tour State (operates on whichever machine & fluid the user selected)
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [isTourPaused, setIsTourPaused] = useState(false);
  const [tourStepElapsed, setTourStepElapsed] = useState(0);
  const [tourTargetMachine, setTourTargetMachine] = useState<MachineId>('m2');
  const [tourTargetFluid, setTourTargetFluid] = useState<FluidType>('coolant');

  // Drop accumulator for steady, natural drop-by-drop detachment
  const dropAccumulatorRef = useRef<Record<MachineId, number>>({ m1: 0, m2: 0, m3: 0, m4: 0 });

  // Handle machine selection change & enforce fluid restrictions
  const handleSelectMachine = useCallback((mId: MachineId) => {
    setSelectedMachine(mId);
    if (!isFluidAllowedForMachine(mId, selectedFluid)) {
      setSelectedFluid(getDefaultFluidForMachine(mId));
    }
    sceneRef.current?.flyToLeakSimulation(mId, selectedZone);
  }, [selectedFluid, selectedZone]);

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

  // Change Leak Velocity and apply immediately to active leak on selected machine
  const handleChangeSpeed = useCallback((speed: LeakSpeed) => {
    setLeakSpeed(speed);
    setMachineLeaks(prev => {
      const cur = prev[selectedMachine];
      if (!cur.isLeaking) return prev;
      return {
        ...prev,
        [selectedMachine]: {
          ...cur,
          leakSpeed: speed
        }
      };
    });
  }, [selectedMachine]);

  // Toggle Leak for Currently Selected Machine
  const handleToggleLeak = useCallback(() => {
    soundEngine.playClickSound();

    setMachineLeaks(prev => {
      const cur = prev[selectedMachine];
      const nextIsLeaking = !cur.isLeaking;

      if (nextIsLeaking) {
        const startTime = Date.now();
        const timeStr = new Date().toLocaleTimeString();

        // Prime accumulator so first individual droplet detaches promptly on leak start
        const cfg = getLeakSpeedConfig(leakSpeed);
        dropAccumulatorRef.current[selectedMachine] = (1.0 / Math.max(cfg.dropsPerSec, 0.4)) * 0.85;

        // Focus 3D camera smoothly on the leakage outlet, droplets, and the two detection electrodes
        sceneRef.current?.flyToLeakSimulation(selectedMachine, selectedZone);

        // Add event record for leak inception
        const speedLabel = leakSpeed === 'heavy_flow' ? 'HEAVY FLOW' : 'LIGHT FLOW';
        const newLog: DetectionEventLog = {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          fullZoneId: `${selectedMachine.toUpperCase()}-${selectedZone.toUpperCase()}`,
          description: `Leak Initiated (${selectedFluid.toUpperCase()} / ${speedLabel})`,
          status: 'active',
          severity: speedLabel
        };
        setEventLogs(logs => [newLog, ...logs.slice(0, 19)]);

        const fluidChanged = cur.fluidType !== selectedFluid;
        return {
          ...prev,
          [selectedMachine]: {
            ...cur,
            activeZone: selectedZone,
            fluidType: selectedFluid,
            leakSpeed: leakSpeed,
            isLeaking: true,
            leakStartTime: startTime,
            contactTime: fluidChanged ? null : cur.contactTime,
            pad1Time: fluidChanged ? null : cur.pad1Time,
            pad3Time: fluidChanged ? null : cur.pad3Time,
            puddles: fluidChanged ? { z1: 0, z2: 0 } : cur.puddles
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

  // Reset All Machines, Puddles, Electrodes, Node/CPU Boxes, General Compartment & Logs
  const handleResetAll = useCallback(() => {
    soundEngine.playClickSound();
    dropAccumulatorRef.current = { m1: 0, m2: 0, m3: 0, m4: 0 };
    sceneRef.current?.resetSimulation();
    setMachineLeaks(createInitialLeaks());
    setPipelineNowMs(Date.now());
    const timeStr = new Date().toLocaleTimeString();
    setEventLogs([{
      id: `reset-${Date.now()}`,
      timestamp: timeStr,
      fullZoneId: 'ALL CELLS',
      description: 'System Reset - Trays Dry & Nodes NORMAL',
      status: 'cleared'
    }]);
  }, []);

  // Guided Demo Tour Automation Controller (Dynamic for ANY selected Machine & Fluid)
  const startGuidedTour = useCallback(() => {
    soundEngine.playClickSound();
    dropAccumulatorRef.current = { m1: 0, m2: 0, m3: 0, m4: 0 };
    sceneRef.current?.resetSimulation();
    setMachineLeaks(createInitialLeaks());
    setPipelineNowMs(Date.now());
    setTourTargetMachine(selectedMachine);
    setTourTargetFluid(selectedFluid);
    setSelectedZone('z1');
    setIsTourActive(true);
    setTourStepIndex(0);
    setIsTourPaused(false);
    setTourStepElapsed(0);
    sceneRef.current?.flyToDemoStep(1, selectedMachine);
  }, [selectedMachine, selectedFluid]);

  // Guided Demo manual step advance: ensures skipped-ahead steps have matching physical puddle + contact progression
  const handleTourNextStep = useCallback(() => {
    setTourStepIndex(curIdx => {
      if (curIdx >= GUIDED_TOUR_STEPS.length - 1) return curIdx;
      const nextIdx = curIdx + 1;
      const nextStep = GUIDED_TOUR_STEPS[nextIdx];
      const minVol = tourTargetFluid === 'oil' ? 2.6 : 1.5;

      if (nextStep && (nextStep.action === 'node_processing' || nextStep.action === 'compartment_transmission' || nextStep.action === 'final_detection')) {
        const now = Date.now();
        // Match realistic elapsed time into scaled Guided Demo pipeline: processing (~4.5s), transmitting (~10.5s), final alert (~17s)
        const offsetMs =
          nextStep.action === 'node_processing'
            ? 4500
            : nextStep.action === 'compartment_transmission'
              ? 10500
              : 17000;
        setMachineLeaks(prev => {
          const cur = prev[tourTargetMachine];
          const existingElapsed = cur.contactTime ? now - cur.contactTime : 0;
          const contactT = existingElapsed >= offsetMs && cur.contactTime ? cur.contactTime : now - offsetMs;
          return {
            ...prev,
            [tourTargetMachine]: {
              ...cur,
              activeZone: 'z1',
              fluidType: tourTargetFluid,
              leakSpeed: cur.leakSpeed || 'light_flow',
              isLeaking: true,
              leakStartTime: cur.leakStartTime || (now - offsetMs - 2000),
              contactTime: contactT,
              puddles: {
                ...cur.puddles,
                z1: Math.max(cur.puddles.z1, minVol)
              }
            }
          };
        });
        setPipelineNowMs(now);
      }

      setTourStepElapsed(0);
      return nextIdx;
    });
  }, [tourTargetMachine, tourTargetFluid]);

  // Execute Guided Tour 6-View steps with real droplet leakage, physical electrode contact, Node/CPU processing & General Compartment alert
  useEffect(() => {
    if (!isTourActive) return;

    const step = GUIDED_TOUR_STEPS[tourStepIndex];
    if (!step) return;

    let delayedDripTimer: number | undefined;

    try {
      sceneRef.current?.flyToDemoStep(step.stepIndex, tourTargetMachine);

      if (step.action === 'machine_overview') {
        setSelectedMachine(tourTargetMachine);
        setSelectedZone('z1');
        setSelectedFluid(tourTargetFluid);
      } else if (step.action === 'leakage_generation') {
        setSelectedMachine(tourTargetMachine);
        setSelectedZone('z1');
        setSelectedFluid(tourTargetFluid);
        setLeakSpeed('light_flow');
        // Delay drip start slightly during the initial camera settle so View 2 shows drop-by-drop formation without pre-contacting electrodes
        const delayMs = tourTargetFluid === 'coolant' ? 2800 : 1200;
        delayedDripTimer = window.setTimeout(() => {
          setMachineLeaks(prev => ({
            ...prev,
            [tourTargetMachine]: {
              ...prev[tourTargetMachine],
              activeZone: 'z1',
              fluidType: tourTargetFluid,
              leakSpeed: 'light_flow',
              isLeaking: true,
              leakStartTime: Date.now(),
              contactTime: null,
              pad1Time: null,
              pad3Time: null,
              puddles: { z1: 0, z2: 0 }
            }
          }));
        }, delayMs);
      } else if (step.action === 'electrode_detection') {
        const detectionSpeed: LeakSpeed = tourTargetFluid === 'oil' ? 'heavy_flow' : 'light_flow';
        setLeakSpeed(detectionSpeed);
        setMachineLeaks(prev => {
          const cur = prev[tourTargetMachine];
          return {
            ...prev,
            [tourTargetMachine]: {
              ...cur,
              activeZone: 'z1',
              fluidType: tourTargetFluid,
              leakSpeed: detectionSpeed,
              isLeaking: true,
              leakStartTime: cur.leakStartTime || Date.now()
            }
          };
        });
      } else if (step.action === 'final_detection') {
        const timeStr = new Date().toLocaleTimeString();
        setEventLogs(logs => [
          {
            id: `tour-${Date.now()}`,
            timestamp: timeStr,
            fullZoneId: `${tourTargetMachine.toUpperCase()}-Z1`,
            description: `General Compartment Alert: ${tourTargetMachine.replace('m', 'Machine 0')} (${tourTargetFluid.toUpperCase()} LEAK)`,
            status: 'active',
            severity: tourTargetFluid.toUpperCase()
          },
          ...logs.slice(0, 19)
        ]);
      }
    } catch (err) {
      console.error('Demo step error, skipping:', err);
    }

    return () => {
      if (delayedDripTimer !== undefined) {
        window.clearTimeout(delayedDripTimer);
      }
    };
  }, [isTourActive, tourStepIndex, tourTargetMachine, tourTargetFluid]);

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

  // Physics & Puddle Accumulation Simulation Loop (20 Hz React updates)
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

        // Drop-by-drop liquid leakage: individual droplets detached one at a time with steady rhythm
        const dropInterval = 1.0 / Math.max(config.dropsPerSec, 0.4);
        dropAccumulatorRef.current[mId] = (dropAccumulatorRef.current[mId] || 0) + dt;
        if (dropAccumulatorRef.current[mId] >= dropInterval) {
          dropAccumulatorRef.current[mId] -= dropInterval;
          sceneRef.current?.spawnDroplet(mId, zId, leak.fluidType);
          soundEngine.playDripSound(leak.fluidType);
        }

        // Puddle accumulation & exact physical contactTime latching
        setMachineLeaks(prev => {
          const m = prev[mId];
          if (!m.isLeaking || m.activeZone === 'none') return prev;
          const activeZ = m.activeZone;
          const currentVol = m.puddles[activeZ];
          const newVol = currentVol + config.volIncrementPerSec * dt;

          const puddleRadius = calculatePuddleRadius(m.fluidType, newVol);
          let newContactTime = m.contactTime;
          let newPad1Time = m.pad1Time;
          let newPad3Time = m.pad3Time;

          if (puddleRadius >= ELECTRODE_CONTACT_RADIUS && newContactTime === null) {
            newContactTime = Date.now();
          }
          if (puddleRadius >= PAD_DISTANCES[0] && newPad1Time === null) {
            newPad1Time = (Date.now() - (m.leakStartTime || Date.now())) / 1000;
          }
          if (puddleRadius >= PAD_DISTANCES[2] && newPad3Time === null) {
            newPad3Time = (Date.now() - (m.leakStartTime || Date.now())) / 1000;
          }

          return {
            ...prev,
            [mId]: {
              ...m,
              contactTime: newContactTime,
              pad1Time: newPad1Time,
              pad3Time: newPad3Time,
              puddles: {
                ...m.puddles,
                [activeZ]: newVol
              }
            }
          };
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [machineLeaks]);

  // Pipeline clock tick whenever any machine has detected fluid contact so Wire -> Node/CPU -> General Compartment transitions advance continuously
  const hasAnyContact = INITIAL_MACHINES.some(id => machineLeaks[id].contactTime !== null);
  useEffect(() => {
    if (!hasAnyContact) return;
    setPipelineNowMs(Date.now());
    const id = window.setInterval(() => {
      setPipelineNowMs(Date.now());
    }, 100);
    return () => window.clearInterval(id);
  }, [hasAnyContact]);

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

  // Derive independent Node/CPU Box + Signal Pipeline states (brisk 3.9s interactive, 3.8x paced for 6-view Guided Demo)
  const pipelineScale = isTourActive ? 3.8 : 1;
  const evaluatedNodeStates = React.useMemo(() => {
    const res: Record<MachineId, MachineNodeState> = {} as any;
    INITIAL_MACHINES.forEach(mId => {
      const leak = machineLeaks[mId];
      res[mId] = deriveMachineNodeState(
        mId,
        evaluatedTelemetry[mId].z1,
        evaluatedTelemetry[mId].z2,
        leak.contactTime,
        pipelineNowMs,
        pipelineScale
      );
    });
    return res;
  }, [evaluatedTelemetry, machineLeaks, pipelineNowMs, pipelineScale]);

  // Active stream metadata (streamFlow stays false; carries Light vs Heavy flow speed cleanly to 3D droplet nozzle)
  const activeStreams = React.useMemo(() => {
    const res: Record<MachineId, { isStreaming: boolean; zone: ZoneId; fluid: FluidType; speed: LeakSpeed }> = {} as any;
    INITIAL_MACHINES.forEach(mId => {
      const leak = machineLeaks[mId];
      res[mId] = {
        isStreaming: false,
        zone: leak.activeZone === 'none' ? 'z1' : leak.activeZone,
        fluid: leak.fluidType,
        speed: leak.leakSpeed
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
  const compartmentAlertsSummary = INITIAL_MACHINES
    .filter(id => evaluatedNodeStates[id].compartmentAlertActive)
    .map(id => `${id}:${evaluatedNodeStates[id].detectedFluid}`)
    .join(',');

  return (
    <div
      data-selected-machine={selectedMachine}
      data-selected-fluid={selectedFluid}
      data-leak-speed={leakSpeed}
      data-node-stages={INITIAL_MACHINES.map(id => `${id}:${evaluatedNodeStates[id].pipelineStage}`).join(',')}
      data-compartment-alerts={compartmentAlertsSummary || 'none'}
      className="relative w-screen h-screen overflow-hidden bg-[#071324] font-formal-sans select-none text-slate-100 flex flex-col"
    >
      
      {/* 1. Top Bar: DRIPWATCH - 3D PROTOTYPE SIMULATION Branding */}
      <header className="min-h-12 h-auto sm:h-12 bg-[#0B1F3A] border-b border-[#1E3557] px-3 sm:px-4 py-1.5 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-1.5 shrink-0 z-40 select-none">
        
        {/* Brand & Subtitle: DRIPWATCH / 3D PROTOTYPE SIMULATION */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-[4px] bg-[#1FA5A0]/20 text-[#1FA5A0] border border-[#1FA5A0]/40 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="font-bold text-sm sm:text-base text-white font-formal-title tracking-wider leading-tight">
              DRIPWATCH
            </h1>
            <span className="text-[9px] sm:text-[11px] text-slate-400 font-formal-mono font-medium tracking-wide uppercase leading-tight whitespace-nowrap">
              3D PROTOTYPE SIMULATION
            </span>
          </div>
        </div>

        {/* Swapped Navigation Buttons: Views & Navigation (Left) & Simulation (Right) */}
        <nav aria-label="Main Navigation" className="order-3 sm:order-none w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 sm:gap-7 lg:gap-10 sm:mx-2">
          {/* 1. Views & Navigation button (left side) */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileDrawer(d => d === 'views' ? 'none' : 'views');
              } else {
                setIsLeftCollapsed(c => !c);
                setTimeout(() => sceneRef.current?.onResize(), 220);
              }
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[4px] border text-[11px] sm:text-xs font-formal-mono transition-all cursor-pointer whitespace-nowrap ${
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

          {/* 2. Simulation button (right side) */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileDrawer(d => d === 'simulation' ? 'none' : 'simulation');
              } else {
                setIsRightCollapsed(c => !c);
                setTimeout(() => sceneRef.current?.onResize(), 220);
              }
            }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[4px] border text-[11px] sm:text-xs font-formal-mono transition-all cursor-pointer whitespace-nowrap ${
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
        </nav>

        {/* Right Controls: Guided Demo Controls, Audio, and Guide */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* PRIMARY GUIDED DEMO BUTTON / CONTROLS */}
          {!isTourActive ? (
            <button
              onClick={startGuidedTour}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-[4px] bg-[#1FA5A0] hover:bg-[#188480] text-slate-950 font-bold text-[11px] sm:text-xs transition-colors cursor-pointer shadow-md whitespace-nowrap"
              title="Start guided prototype demonstration"
            >
              <Compass className="w-3.5 h-3.5 fill-current shrink-0" />
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
                onClick={handleTourNextStep}
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

      {/* 2. Main Center Body: Responsive Grid Layout */}
      <div className="flex flex-1 min-h-0 min-w-0 relative overflow-hidden bg-[#071324]">
        
        {/* Mobile Drawer Backdrop */}
        {mobileDrawer !== 'none' && (
          <div
            onClick={() => setMobileDrawer('none')}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            aria-hidden="true"
          />
        )}

        {/* Left Sidebar */}
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

        {/* Center Column: 3D Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative h-full overflow-hidden bg-[#071324]">
          
          {/* 3D WebGL Canvas Area */}
          <main className="flex-1 relative min-w-0 min-h-0 w-full bg-[#071324] overflow-hidden">
            
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
              targetMachine={tourTargetMachine}
              targetFluid={tourTargetFluid}
              isPaused={isTourPaused}
              stepProgressPercent={stepProgressPct}
              onTogglePause={() => setIsTourPaused(!isTourPaused)}
              onNextStep={handleTourNextStep}
              onPrevStep={() => {
                if (tourStepIndex > 0) {
                  setTourStepIndex(tourStepIndex - 1);
                  setTourStepElapsed(0);
                }
              }}
              onRestart={startGuidedTour}
              onExitTour={() => setIsTourActive(false)}
            />

            {/* Bottom-Left 3D Visualization Label (No backdrop-blur over WebGL canvas) */}
            <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3.5 z-20 pointer-events-none select-none">
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-formal-mono font-medium text-slate-300/90 bg-[#071324]/90 px-2.5 py-1 rounded-[4px] border border-[#1E3557]/80 shadow-md inline-block">
                ILLUSTRATIVE SIMULATION OF THE FINAL DEMONSTRATIVE PROTOTYPE
              </span>
            </div>

          </main>

        </div>

        {/* Right Sidebar */}
        <div className={`
          lg:relative lg:flex lg:z-10 h-full
          ${mobileDrawer === 'simulation' ? 'fixed inset-y-0 right-0 z-50 flex max-w-[75%] sm:max-w-[320px]' : 'hidden'}
        `}>
          <RightSidebar
            telemetry={evaluatedTelemetry}
            nodeStates={evaluatedNodeStates}
            selectedMachine={selectedMachine}
            onSelectMachine={handleSelectMachine}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            selectedFluid={selectedFluid}
            onSelectFluid={setSelectedFluid}
            leakSpeed={leakSpeed}
            onChangeSpeed={handleChangeSpeed}
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
      <InsideSensorModal
        isOpen={isInsideSensorModalOpen}
        onClose={() => setIsInsideSensorModalOpen(false)}
        fluidSimulated={selectedFluid}
      />

      <EvaluatorGuideModal
        isOpen={isEvaluatorGuideOpen}
        onClose={() => setIsEvaluatorGuideOpen(false)}
        onStartGuidedTour={startGuidedTour}
      />

    </div>
  );
}
