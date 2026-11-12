import React, { useEffect, useRef, useState } from 'react';
import { DripWatchScene } from '../three/DripWatchScene';
import { MachineId, ZoneId, FluidType, ZoneTelemetry, MachineNodeState, RenderQuality } from '../types/dripwatch';
import { AlertCircle } from 'lucide-react';

interface ThreeCanvasProps {
  telemetry: Record<MachineId, Record<ZoneId, ZoneTelemetry>>;
  nodeStates: Record<MachineId, MachineNodeState>;
  activeStreams: Record<MachineId, { isStreaming: boolean; zone: ZoneId; fluid: FluidType }>;
  quality: RenderQuality;
  sceneRef: React.MutableRefObject<DripWatchScene | null>;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  telemetry,
  nodeStates,
  activeStreams,
  quality,
  sceneRef
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGlError, setWebGlError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Test WebGL availability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      setWebGlError('WebGL 3D graphics hardware acceleration is disabled or unsupported in this browser environment.');
      return;
    }

    try {
      const scene = new DripWatchScene(
        mountRef.current,
        quality
      );
      sceneRef.current = scene;

      // Observe canvas container resizing (sidebar collapse, dashboard toggle, window resize)
      const ro = new ResizeObserver(() => {
        scene.onResize();
      });
      ro.observe(mountRef.current);

      return () => {
        ro.disconnect();
        scene.destroy();
        sceneRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize 3D DripWatchScene:', err);
      setWebGlError('Could not initialize 3D WebGL renderer. Please ensure hardware acceleration is enabled.');
    }
  }, []);

  // Sync quality settings
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setQuality(quality);
    }
  }, [quality]);

  // Sync simulation telemetry with Three.js scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateSimulation(telemetry, nodeStates, activeStreams);
    }
  }, [telemetry, nodeStates, activeStreams]);

  if (webGlError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#071324] p-6 text-white text-center font-formal-sans">
        <div className="max-w-md p-6 bg-[#0B1F3A] border border-[#1E3557] rounded-[6px] shadow-2xl space-y-3">
          <AlertCircle className="w-10 h-10 text-[#D98200] mx-auto" />
          <h3 className="text-base font-semibold text-slate-100 font-formal-title">3D Graphics Fallback</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{webGlError}</p>
          <div className="p-3 bg-[#071324] rounded-[4px] border border-[#1E3557] text-xs text-slate-300 font-formal-mono">
            Plant SCADA console, incident event logs, and IoT telemetry remain fully operational.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none">
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        data-testid="three-canvas-container"
      />
    </div>
  );
};
