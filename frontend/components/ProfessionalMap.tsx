import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  magnitude: number;
  type: 'port' | 'farm' | 'mine' | 'energy';
  status: 'critical' | 'warning' | 'normal';
}

interface ProfessionalMapProps {
  hotspots: Hotspot[];
  selectedSignal: any;
  onHotspotClick: (id: string) => void;
}

export default function ProfessionalMap({ hotspots, selectedSignal, onHotspotClick }: ProfessionalMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapRef.current) return;

    const mapElement = document.getElementById('professional-map');
    if (!mapElement) return;

    // Create map with professional dark theme
    mapRef.current = L.map('professional-map', {
      center: [20, 0],
      zoom: 2.5,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    // Use dark tile layer
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      opacity: 0.9,
    }).addTo(mapRef.current);

    // Add minimal zoom control
    L.control.zoom({
      position: 'topright'
    }).addTo(mapRef.current);

    // Add custom styles
    const style = document.createElement('style');
    style.textContent = `
      #professional-map {
        background: #0a0b0d;
      }
      .leaflet-container {
        background: #0a0b0d;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .leaflet-control-zoom a {
        background: rgba(15, 23, 42, 0.9) !important;
        color: #94a3b8 !important;
        border: 1px solid rgba(51, 65, 85, 0.5) !important;
        backdrop-filter: blur(8px);
      }
      .leaflet-control-zoom a:hover {
        background: rgba(30, 41, 59, 0.9) !important;
        color: #cbd5e1 !important;
      }
      .leaflet-popup-content-wrapper {
        background: rgba(15, 23, 42, 0.95);
        color: #e2e8f0;
        border: 1px solid rgba(51, 65, 85, 0.5);
        backdrop-filter: blur(8px);
        border-radius: 8px;
      }
      .leaflet-popup-tip {
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(51, 65, 85, 0.5);
      }
      .leaflet-popup-close-button {
        color: #94a3b8 !important;
      }
      .leaflet-popup-close-button:hover {
        color: #e2e8f0 !important;
      }
      
      @keyframes pulse-critical {
        0%, 100% { 
          stroke-opacity: 1;
          stroke-width: 2;
          transform: scale(1);
        }
        50% { 
          stroke-opacity: 0.5;
          stroke-width: 3;
          transform: scale(1.05);
        }
      }
      
      @keyframes pulse-warning {
        0%, 100% { 
          stroke-opacity: 0.8;
          transform: scale(1);
        }
        50% { 
          stroke-opacity: 0.4;
          transform: scale(1.03);
        }
      }
      
      @keyframes glow {
        0%, 100% { 
          fill-opacity: 0.15;
          transform: scale(1);
        }
        50% { 
          fill-opacity: 0.05;
          transform: scale(1.3);
        }
      }
      
      .hotspot-critical {
        animation: pulse-critical 2s ease-in-out infinite;
        transform-origin: center;
      }
      
      .hotspot-warning {
        animation: pulse-warning 2.5s ease-in-out infinite;
        transform-origin: center;
      }
      
      .hotspot-glow {
        animation: glow 3s ease-in-out infinite;
        transform-origin: center;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    setMapReady(true);
  }, []);

  // Update hotspots
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Add new hotspots
    hotspots.forEach(hotspot => {
      // Determine colors based on status
      const colors = {
        critical: { main: '#ef4444', glow: '#dc2626' },
        warning: { main: '#f59e0b', glow: '#d97706' },
        normal: { main: '#10b981', glow: '#059669' }
      };
      
      const color = colors[hotspot.status];
      const radius = hotspot.status === 'critical' ? 10 : 
                    hotspot.status === 'warning' ? 8 : 6;

      // Create glow layer
      const glowMarker = L.circleMarker([hotspot.lat, hotspot.lng], {
        radius: radius * 2.5,
        fillColor: color.glow,
        color: 'transparent',
        fillOpacity: 0.15,
        className: 'hotspot-glow'
      }).addTo(mapRef.current!);

      // Create main marker
      const marker = L.circleMarker([hotspot.lat, hotspot.lng], {
        radius: radius,
        fillColor: color.main,
        color: color.main,
        weight: 2,
        opacity: 1,
        fillOpacity: 0.6,
        className: `hotspot-${hotspot.status}`
      }).addTo(mapRef.current!);

      // Icon overlay
      const iconMap = {
        port: '🚢',
        farm: '🌾',
        mine: '⛏️',
        energy: '⚡'
      };

      // Create custom popup
      const popupContent = `
        <div style="min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 24px;">${iconMap[hotspot.type]}</span>
            <div>
              <h4 style="margin: 0; font-weight: 600; color: #f1f5f9; font-size: 14px;">
                ${hotspot.name}
              </h4>
              <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">
                ${hotspot.type.charAt(0).toUpperCase() + hotspot.type.slice(1)} Facility
              </div>
            </div>
          </div>
          <div style="border-top: 1px solid rgba(51, 65, 85, 0.5); padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="color: #94a3b8; font-size: 12px;">Anomaly Score</span>
              <span style="color: ${color.main}; font-weight: 600; font-size: 14px;">
                ${(hotspot.magnitude * 100).toFixed(0)}%
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8; font-size: 12px;">Status</span>
              <span style="color: ${color.main}; font-weight: 500; font-size: 12px;">
                ${hotspot.status.toUpperCase()}
              </span>
            </div>
          </div>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('hotspot-analyze', { detail: '${hotspot.id}' }))"
            style="
              margin-top: 12px;
              width: 100%;
              padding: 6px 12px;
              background: linear-gradient(135deg, #4f46e5, #7c3aed);
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
            "
            onmouseover="this.style.opacity='0.9'"
            onmouseout="this.style.opacity='1'"
          >
            Analyze Impact →
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'professional-popup',
        closeButton: true,
        minWidth: 220,
        maxWidth: 280
      });

      // Handle click
      marker.on('click', () => {
        onHotspotClick(hotspot.id);
      });

      markersRef.current.set(hotspot.id, marker);
    });

    // Listen for analyze events
    const handleAnalyze = (e: any) => {
      onHotspotClick(e.detail);
    };
    window.addEventListener('hotspot-analyze', handleAnalyze);
    return () => window.removeEventListener('hotspot-analyze', handleAnalyze);
  }, [hotspots, mapReady, onHotspotClick]);

  // Auto-focus on selected signal
  useEffect(() => {
    if (!mapRef.current || !selectedSignal) return;

    // Find corresponding hotspot
    const hotspot = hotspots.find(h => h.id === `hotspot-${selectedSignal.id}`);
    if (hotspot) {
      mapRef.current.flyTo([hotspot.lat, hotspot.lng], 6, {
        duration: 1.5,
        easeLinearity: 0.25
      });

      // Highlight the marker
      const marker = markersRef.current.get(hotspot.id);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedSignal, hotspots]);

  return (
    <div 
      id="professional-map" 
      className="w-full h-full"
      style={{ 
        background: 'linear-gradient(180deg, #0a0b0d 0%, #0f172a 100%)',
        position: 'relative'
      }}
    >
      {/* Grid overlay for professional look */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(51, 65, 85, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(51, 65, 85, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          pointerEvents: 'none',
          opacity: 0.3,
          zIndex: 1
        }}
      />
    </div>
  );
}
