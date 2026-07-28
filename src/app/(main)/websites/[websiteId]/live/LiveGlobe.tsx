'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface GlobeVisitor {
  id: string;
  lat: number;
  lng: number;
  active: boolean;
  /** 0..1 — scales the marker (e.g. engagement/recency). */
  weight?: number;
}

// Free vector basemap with real geography and city/street labels at zoom.
const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/**
 * Real-earth globe (MapLibre v5 globe projection): space view zoomed out,
 * Google-Earth-style dive to city/street labels on scroll. Everything data-
 * driven goes through setData/paint updates — React never re-renders during
 * animation, which is what keeps it smooth where the old page stuttered.
 *
 * - Idle: slow auto-spin (only while zoomed out; pauses on interaction).
 * - Scroll: zoom from orbit to street level (maxZoom 17).
 * - `focus`: flies the camera to a visitor at city zoom.
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
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const spinRef = useRef(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitorsRef = useRef<GlobeVisitor[]>([]);
  visitorsRef.current = visitors;

  const toGeoJSON = (list: GlobeVisitor[]) =>
    ({
      type: 'FeatureCollection',
      features: list
        .filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng))
        .slice(0, 300)
        .map(v => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
          properties: { active: v.active ? 1 : 0, weight: Math.min(1, v.weight ?? 0.4) },
        })),
    }) as FeatureCollection;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || mapRef.current) return;

    const map = new maplibregl.Map({
      container: wrap,
      style: STYLE_URL,
      center: [40, 18],
      zoom: 1.7,
      minZoom: 1.1,
      maxZoom: 17,
      attributionControl: false,
      fadeDuration: 150,
    });
    mapRef.current = map;

    map.on('style.load', () => {
      try {
        map.setProjection({ type: 'globe' });
      } catch {
        /* flat fallback on very old GPUs */
      }
      try {
        // Space-black canvas behind the globe + soft atmosphere halo.
        (map as any).setSky?.({
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 1, 8, 0],
        });
      } catch {
        /* ignore */
      }
      // Blend the basemap's background into the page's space background.
      for (const layer of map.getStyle().layers || []) {
        if (layer.type === 'background') {
          try {
            map.setPaintProperty(layer.id, 'background-color', '#04040a');
          } catch {
            /* ignore */
          }
        }
      }

      map.addSource('visitors', { type: 'geojson', data: toGeoJSON(visitorsRef.current) });

      // Soft glow under active visitors.
      map.addLayer({
        id: 'v-halo',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'active'], 1],
        paint: {
          'circle-radius': ['+', 11, ['*', 7, ['get', 'weight']]],
          'circle-color': '#8b88d8',
          'circle-blur': 1,
          'circle-opacity': 0.4,
        },
      });
      // Recent (last hour) — dim, small.
      map.addLayer({
        id: 'v-recent',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'active'], 0],
        paint: {
          'circle-radius': 3,
          'circle-color': '#8b88d8',
          'circle-opacity': 0.35,
        },
      });
      // Active — bright core with white ring.
      map.addLayer({
        id: 'v-active',
        type: 'circle',
        source: 'visitors',
        filter: ['==', ['get', 'active'], 1],
        paint: {
          'circle-radius': ['+', 4, ['*', 2.5, ['get', 'weight']]],
          'circle-color': '#a5a1ff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.2,
        },
      });

      readyRef.current = true;
    });

    // Gentle breathing pulse on the halo (paint-property tween, no React).
    const pulse = setInterval(() => {
      if (!readyRef.current || !mapRef.current) return;
      const t = (Date.now() % 2000) / 2000;
      const s = 1 + 0.35 * Math.sin(t * Math.PI * 2);
      try {
        mapRef.current.setPaintProperty('v-halo', 'circle-radius', [
          '+',
          11 * s,
          ['*', 7, ['get', 'weight']],
        ]);
      } catch {
        /* layer not ready */
      }
    }, 90);

    // Slow orbital spin while zoomed out and untouched.
    let raf = 0;
    const spin = () => {
      const m = mapRef.current;
      if (m && spinRef.current && readyRef.current && m.getZoom() < 3.2 && !m.isMoving()) {
        const c = m.getCenter();
        m.jumpTo({ center: [c.lng + 0.018, c.lat] });
      }
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);

    const pauseSpin = () => {
      spinRef.current = false;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        spinRef.current = true;
      }, 8000);
    };
    map.on('mousedown', pauseSpin);
    map.on('touchstart', pauseSpin);
    map.on('wheel', pauseSpin);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(pulse);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visitor updates → setData (never re-create the map).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource('visitors') as maplibregl.GeoJSONSource | undefined;
    src?.setData(toGeoJSON(visitors));
  }, [visitors]);

  // Focus request → cinematic fly-to at city zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    spinRef.current = false;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: 5.5, speed: 0.85, curve: 1.5 });
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      spinRef.current = true;
    }, 9000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ background: '#04040a' }}
      aria-label="Live visitor globe"
    />
  );
}
