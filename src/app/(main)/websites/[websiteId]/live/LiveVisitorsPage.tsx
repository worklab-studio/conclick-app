'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useWebsiteQuery, useRealtimeQuery } from '@/components/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Globe as GlobeIcon,
  MapPin,
  Activity,
  ExternalLink,
  X,
  ChevronDown,
  RotateCw,
} from 'lucide-react';
import Map, { Popup, NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

export function LiveVisitorsPage({ websiteId }: { websiteId: string }) {
  const [isClient, setIsClient] = useState(false);
  const { data: website } = useWebsiteQuery(websiteId);
  const { data: realtimeData } = useRealtimeQuery(websiteId, isClient);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
  const [isPopupOccluded, setIsPopupOccluded] = useState(false);
  const [isAutoPanning, setIsAutoPanning] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mapRef = useRef<any>(null);
  const isInteracting = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-panning effect
  useEffect(() => {
    if (!isAutoPanning || !mapRef.current) return;

    const map = mapRef.current.getMap();

    const rotateFn = () => {
      if (isInteracting.current) return;

      const center = map.getCenter();
      // Move longitude slightly to rotate right-to-left (Globe spins, camera stays or moves?)
      // Decreasing longitude moves the "camera" West (Right relative to space?), making the globe surface move Left -> Right?
      // Increasing longitude moves "camera" East (Left relative to space?), making globe surface move Right -> Left.
      center.lng += 0.2;
      map.easeTo({ center, duration: 0, easing: (t: number) => t });
    };

    const interval = setInterval(rotateFn, 20); // Smooth 60fps-ish
    return () => clearInterval(interval);
  }, [isAutoPanning]);

  const handleShare = async () => {
    const url = `${window.location.origin}/share/${websiteId}/live`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy:', err);
    }
  };

  const toggleAutoPanning = () => {
    setIsAutoPanning(!isAutoPanning);
  };

  const toggleMusic = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(
        'https://assets.mixkit.co/music/preview/mixkit-deep-urban-623.mp3',
      );
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3;
    }

    if (isMusicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleInteractionStart = () => {
    isInteracting.current = true;
  };

  const handleInteractionEnd = () => {
    isInteracting.current = false;
  };

  const visitors = realtimeData?.visitors || [];

  const visitorData = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: visitors.map((v: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [v.lng, v.lat], // Ensure API returns lng/lat
        },
        properties: {
          ...v,
          // Ensure these fields exist or provide defaults
          id: v.id || Math.random().toString(),
          country: v.country || 'Unknown',
          city: v.city || 'Unknown',
          referrer: v.referrer || 'Direct',
          page: v.urlPath || '/',
          time: 'Just now', // Realtime data is usually "now"
        },
      })),
    };
  }, [visitors]);

  // Handle map load and layer creation
  const handleMapLoad = (event: any) => {
    const map = event.target;

    if (!map.getSource('visitors')) {
      // Add Source
      map.addSource('visitors', {
        type: 'geojson',
        data: visitorData as any,
      });

      // Add Glow Layer
      map.addLayer({
        id: 'visitor-glow',
        type: 'circle',
        source: 'visitors',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 40, 2, 15, 4, 20],
          'circle-color': '#6366f1',
          'circle-opacity': 0.3,
          'circle-blur': 0.4,
          'circle-pitch-alignment': 'map',
          'circle-pitch-scale': 'map',
        },
      });

      // Add Dot Layer
      map.addLayer({
        id: 'visitor-dots',
        type: 'circle',
        source: 'visitors',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 2, 6, 4, 8],
          'circle-color': '#818cf8',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 1,
          'circle-pitch-alignment': 'map',
          'circle-pitch-scale': 'map',
        },
      });
    }
  };

  // Update visitor data when it changes
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const source = map.getSource('visitors');
    if (source) {
      (source as any).setData(visitorData);
    }
  }, [visitorData]);

  // Occlusion detection: hide popup when marker is behind globe
  useEffect(() => {
    if (!selectedVisitor || !mapRef.current) {
      setIsPopupOccluded(false);
      return;
    }

    const map = mapRef.current.getMap();

    const checkOcclusion = () => {
      if (!selectedVisitor) return;

      // Query rendered features at the marker location
      const point = map.project([selectedVisitor.lng, selectedVisitor.lat]);

      // Check if the point is within the canvas bounds
      const canvas = map.getCanvas();
      const isInBounds =
        point.x >= 0 && point.x <= canvas.width && point.y >= 0 && point.y <= canvas.height;

      if (!isInBounds) {
        setIsPopupOccluded(true);
        return;
      }

      // Query features at this pixel location
      const features = map.queryRenderedFeatures(point, {
        layers: ['visitor-dots'],
      });

      // Check if our specific visitor is in the rendered features
      const isVisible = features.some((f: any) => f.properties?.id === selectedVisitor.id);

      setIsPopupOccluded(!isVisible);
    };

    // Check immediately
    checkOcclusion();

    // Re-check on map movement/rotation
    map.on('move', checkOcclusion);
    map.on('rotate', checkOcclusion);
    map.on('pitch', checkOcclusion);
    map.on('zoom', checkOcclusion);

    return () => {
      map.off('move', checkOcclusion);
      map.off('rotate', checkOcclusion);
      map.off('pitch', checkOcclusion);
      map.off('zoom', checkOcclusion);
    };
  }, [selectedVisitor]);

  const mapStyle = useMemo(
    () => ({
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#0B1121',
          },
        },
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 22,
          paint: {
            'raster-contrast': 0.3,
            'raster-brightness-min': 0.15,
            'raster-saturation': -1,
            'raster-opacity': 0.8,
          },
        },
      ],
      sky: {
        'sky-color': '#0B1121',
        'sky-horizon-blend': 0.3,
        'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 0],
      },
    }),
    [],
  );

  const visitorCount = visitors.length;
  const countryCounts = visitors.reduce(
    (acc: any, v: any) => {
      const country = v.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading Globe...
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative bg-[#020410] overflow-hidden">
      <style jsx global>{`
        .stars {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image:
            radial-gradient(1px 1px at 25px 5px, white, rgba(255, 255, 255, 0)),
            radial-gradient(1px 1px at 50px 25px, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0)),
            radial-gradient(
              1.5px 1.5px at 125px 20px,
              rgba(255, 255, 255, 0.6),
              rgba(255, 255, 255, 0)
            ),
            radial-gradient(2px 2px at 250px 80px, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0));
          background-size: 350px 350px;
          opacity: 0.5;
          pointer-events: none;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .maplibregl-popup-content {
          background: transparent;
          box-shadow: none;
          padding: 0;
          border: none;
        }
        .maplibregl-popup-tip {
          display: none;
        }
        .maplibregl-ctrl-group {
          background-color: #18181b !important;
          border: 1px solid #27272a !important;
        }
        .maplibregl-ctrl button {
          color: #f4f4f5 !important;
          border: none !important;
        }
        .maplibregl-ctrl button:hover {
          background-color: #27272a !important;
        }
        /* Hide the info/attribution icon at bottom */
        .maplibregl-ctrl-attrib,
        .maplibregl-compact {
          display: none !important;
        }
      `}</style>

      {/* Star Field */}
      <div className="stars" />

      {/* Stats Panel - Top Left */}
      <div className="absolute top-6 left-6 z-[1000] space-y-3">
        {/* Branding Header */}
        <div className="flex items-center gap-3 px-2">
          <img src="/images/conclick-logo-dark.png" alt="Conclick" className="h-6 w-auto" />
          <div className="h-5 w-px bg-white/20"></div>
          <span className="text-white/80 text-sm font-medium">Real time</span>
        </div>

        <Card className="w-80 shadow-2xl border-white/10 bg-black/40 backdrop-blur-md text-zinc-200">
          <CardHeader className="pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-lg font-semibold text-white">Live Visitors</CardTitle>
            </div>
          </CardHeader>

          {/* Control Buttons Row - Between Header and Content */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-white/5 bg-white/5">
            <div className="flex w-full gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`flex-1 h-8 hover:bg-white/10 transition-colors ${copied ? 'text-green-400' : 'text-zinc-400 hover:text-white'}`}
                title={copied ? 'Copied!' : 'Share public link'}
                onClick={handleShare}
              >
                {copied ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                  </svg>
                )}
              </Button>
              <div className="h-4 my-auto w-px bg-white/10 mx-1"></div>
              <Button
                variant="ghost"
                size="sm"
                className={`flex-1 h-8 hover:bg-white/10 transition-colors ${isAutoPanning ? 'text-indigo-400 bg-white/10' : 'text-zinc-400 hover:text-white'}`}
                title={isAutoPanning ? 'Stop Auto Panning' : 'Start Auto Panning'}
                onClick={toggleAutoPanning}
              >
                <RotateCw className={`h-3.5 w-3.5 ${isAutoPanning ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`flex-1 h-8 hover:bg-white/10 transition-colors ${isMusicPlaying ? 'text-indigo-400 bg-white/10' : 'text-zinc-400 hover:text-white'}`}
                title={isMusicPlaying ? 'Stop Music' : 'Start Music'}
                onClick={toggleMusic}
              >
                {isMusicPlaying ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                  </svg>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-8 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Full screen"
                onClick={toggleFullscreen}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              </Button>
            </div>
          </div>

          <CardContent className="space-y-4 pt-4">
            {/* Website Info */}
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                <GlobeIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Website</span>
              </div>
              <p className="font-bold text-white text-lg">{website?.name}</p>
              <p className="text-sm text-zinc-500">{website?.domain}</p>
            </div>

            {/* Live Count */}
            <div className="pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 font-medium">Active Now</span>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold text-indigo-400">{visitorCount}</span>
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details - Collapsible */}
            <Collapsible
              open={isDetailsOpen}
              onOpenChange={setIsDetailsOpen}
              className="pt-3 border-t border-white/5"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-zinc-400 hover:text-white transition-colors group">
                <span className="font-medium">Details</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform text-zinc-500 group-hover:text-zinc-300 ${isDetailsOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                {/* Countries */}
                <div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>Locations</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(countryCounts)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([country, count]) => (
                        <div
                          key={country}
                          className="flex items-center justify-between text-sm group/item hover:bg-white/5 p-1 rounded transition-colors"
                        >
                          <span className="text-zinc-300">{country}</span>
                          <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-full text-xs">
                            {count as number}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top Referrers */}
                <div className="pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                    <ExternalLink className="h-4 w-4" />
                    <span>Top Sources</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(
                      visitors.reduce(
                        (acc: any, v: any) => {
                          const referrer = v.referrer || 'Direct';
                          acc[referrer] = (acc[referrer] || 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>,
                      ),
                    )
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .slice(0, 5)
                      .map(([referrer, count]) => (
                        <div
                          key={referrer}
                          className="flex items-center justify-between text-sm p-1 rounded hover:bg-white/5 transition-colors"
                        >
                          <span className="truncate text-zinc-300">{referrer}</span>
                          <span className="font-semibold text-white bg-white/10 px-2 py-0.5 rounded-full text-xs">
                            {count as number}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>

      {/* MapLibre Map */}
      <Map
        onLoad={handleMapLoad}
        onMouseDown={handleInteractionStart}
        onMouseUp={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onDragStart={handleInteractionStart}
        onDragEnd={handleInteractionEnd}
        ref={mapRef}
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 2.5,
        }}
        interactiveLayerIds={['visitor-dots']}
        onClick={e => {
          const feature = e.features?.[0];
          if (feature) {
            e.originalEvent.stopPropagation();
            // Coordinates in GeoJSON are [lng, lat]
            const coords = (feature.geometry as any).coordinates;
            const props = feature.properties as any;
            // Map properties back to our visitor object structure
            // Note: GeoJSON properties are serialized, ensure types match or cast
            setSelectedVisitor({
              id: props.id,
              country: props.country,
              city: props.city,
              lat: coords[1],
              lng: coords[0],
              referrer: props.referrer,
              page: props.page,
              time: props.time,
            });
          }
        }}
        onMouseEnter={() => {
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
        }}
        onMouseLeave={() => {
          if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'default';
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle as any}
        projection="globe"
        logoPosition="bottom-right"
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <FullscreenControl position="bottom-right" />

        {selectedVisitor && !isPopupOccluded && (
          <Popup
            longitude={selectedVisitor.lng}
            latitude={selectedVisitor.lat}
            anchor="bottom"
            onClose={() => setSelectedVisitor(null)}
            closeOnClick={false}
            offset={20}
            // Custom CSS to hide default MapLibre popup elements
            style={
              {
                '--maplibregl-popup-max-width': 'none', // Allow custom width
              } as React.CSSProperties
            }
          >
            <style>
              {`
                                .maplibregl-popup-close-button {
                                    display: none !important;
                                }
                                .maplibregl-popup-tip {
                                    display: none;
                                }
                                .maplibregl-ctrl-group {
                                    background-color: #18181b !important;
                                    border: 1px solid #27272a !important;
                                }
                                .maplibregl-ctrl button {
                                    color: #f4f4f5 !important;
                                    border: none !important;
                                }
                                .maplibregl-ctrl button:hover {
                                    background-color: #27272a !important;
                                }
                                /* Hide the info/attribution icon at bottom */
                                .maplibregl-ctrl-attrib,
                                .maplibregl-compact {
                                    display: none !important;
                                }
                            `}
            </style>
            <div className="relative w-60 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl overflow-hidden p-0">
              {/* Close Button at top-right of the card */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedVisitor(null);
                  }}
                  className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-4">
                {/* Header: Avatar + Location */}
                <div className="flex items-center gap-3 mb-4 pr-6">
                  <img
                    src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${selectedVisitor.id}`}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">
                      {selectedVisitor.country}
                    </p>
                    <p className="text-xs text-zinc-400 font-medium">{selectedVisitor.city}</p>
                  </div>
                </div>

                {/* Content Rows */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-medium">Page</span>
                    <span
                      className="text-zinc-200 font-medium truncate max-w-[120px]"
                      title={selectedVisitor.page}
                    >
                      {selectedVisitor.page}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-medium">Source</span>
                    <span className="text-zinc-200 font-medium truncate max-w-[120px]">
                      {selectedVisitor.referrer}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-medium">Time</span>
                    <span className="text-zinc-200 font-medium border border-zinc-700 bg-zinc-900 rounded px-1.5 py-0.5">
                      {selectedVisitor.time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
