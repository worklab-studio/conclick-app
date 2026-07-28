'use client';

import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export interface GlobeVisitor {
  id: string;
  lat: number;
  lng: number;
  active: boolean;
  /** 0..1 — scales the marker (e.g. buying-intent or recency). */
  weight?: number;
}

// cobe's official location→angles mapping.
function locationToAngles(lat: number, lng: number): [number, number] {
  return [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

/**
 * Premium WebGL globe (cobe): dotted continents, indigo glow, exact lat/lng
 * markers. Everything per-frame is mutated through refs inside onRender — no
 * React re-renders during animation, which is what keeps it at 60fps where
 * the old vector-tile map stuttered.
 *
 * - Idle: slow auto-rotation.
 * - Drag: rotate with inertia.
 * - `focus`: eases the camera to a visitor (new arrival / feed click).
 */
export function LiveGlobe({
  visitors,
  focus,
  className,
}: {
  visitors: GlobeVisitor[];
  focus?: { lat: number; lng: number; key: string } | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const markersRef = useRef<{ location: [number, number]; size: number }[]>([]);
  const phiRef = useRef(0.3);
  const thetaRef = useRef(0.25);
  const targetRef = useRef<{ phi: number; theta: number } | null>(null);
  const draggingRef = useRef<{ x: number; y: number; phi: number; theta: number } | null>(null);
  const inertiaRef = useRef(0);
  const idleRef = useRef(true);

  // Visitors → markers (active bright & big, recent small & dim via size).
  useEffect(() => {
    markersRef.current = visitors
      .filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng))
      .slice(0, 120)
      .map(v => ({
        location: [v.lat, v.lng] as [number, number],
        size: v.active ? 0.055 + 0.05 * Math.min(1, v.weight ?? 0.4) : 0.022,
      }));
  }, [visitors]);

  // Focus request → set easing target and pause idle spin briefly.
  useEffect(() => {
    if (!focus) return;
    const [phi, theta] = locationToAngles(focus.lat, focus.lng);
    targetRef.current = { phi, theta: Math.max(-1.1, Math.min(1.1, theta)) };
    idleRef.current = false;
    const t = setTimeout(() => {
      idleRef.current = true;
      targetRef.current = null;
    }, 4500);
    return () => clearTimeout(t);
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let width = wrap.clientWidth;
    let height = wrap.clientHeight;
    const size = Math.min(width, height);

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 22000,
      mapBrightness: 5.2,
      baseColor: [0.16, 0.16, 0.28],
      markerColor: [0.62, 0.58, 1],
      glowColor: [0.22, 0.2, 0.5],
      markers: [],
      opacity: 0.92,
      onRender: state => {
        // Ease toward a focus target, else idle-rotate (unless dragging).
        const target = targetRef.current;
        if (target && !draggingRef.current) {
          let dPhi = target.phi - phiRef.current;
          // shortest path around the sphere
          while (dPhi > Math.PI) dPhi -= 2 * Math.PI;
          while (dPhi < -Math.PI) dPhi += 2 * Math.PI;
          phiRef.current += dPhi * 0.07;
          thetaRef.current += (target.theta - thetaRef.current) * 0.07;
        } else if (!draggingRef.current) {
          phiRef.current += idleRef.current ? 0.0028 : 0.0006;
          phiRef.current += inertiaRef.current;
          inertiaRef.current *= 0.93;
        }
        state.phi = phiRef.current;
        state.theta = thetaRef.current;
        state.markers = markersRef.current;
        state.width = size * 2;
        state.height = size * 2;
      },
    });

    const onDown = (e: PointerEvent) => {
      draggingRef.current = {
        x: e.clientX,
        y: e.clientY,
        phi: phiRef.current,
        theta: thetaRef.current,
      };
      idleRef.current = false;
      targetRef.current = null;
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      phiRef.current = d.phi + dx / 160;
      thetaRef.current = Math.max(-1.1, Math.min(1.1, d.theta + dy / 240));
      inertiaRef.current = dx / 16000;
    };
    const onUp = () => {
      draggingRef.current = null;
      canvas.style.cursor = 'grab';
      setTimeout(() => {
        idleRef.current = true;
      }, 1800);
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const ro = new ResizeObserver(() => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
    });
    ro.observe(wrap);

    return () => {
      globe.destroy();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className={`flex items-center justify-center ${className || ''}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: 'min(100%, 78vh)',
          aspectRatio: '1',
          cursor: 'grab',
          contain: 'layout paint size',
        }}
        aria-label="Live visitor globe"
      />
    </div>
  );
}
