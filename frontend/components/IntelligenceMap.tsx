import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface Hotspot {
  id: string;
  lat: number;
  lng: number;
  magnitude: number;
  name: string;
}

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  hotspots: Hotspot[];
  selectedAoi: any;
  onAoiClick: (aoi: any) => void;
  focusedRegion?: string;
  showHeatmap?: boolean;
  enableClustering?: boolean;
}

export default function IntelligenceMap({ 
  center, 
  zoom, 
  hotspots, 
  selectedAoi, 
  onAoiClick,
  focusedRegion,
  showHeatmap = false,
  enableClustering = false
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const heatmapLayerRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on SSR
    
    if (!mapRef.current) {
      const mapElement = document.getElementById('intelligence-map');
      if (!mapElement) return;
      
      // Initialize map
      mapRef.current = L.map('intelligence-map', {
        zoomControl: false
      }).setView([center.lat, center.lng], zoom);

      // Add dark tile layer
      L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap',
      }).addTo(mapRef.current);

      // Add zoom control to top right
      L.control.zoom({
        position: 'topright'
      }).addTo(mapRef.current);

      // Add scale control
      L.control.scale({
        position: 'bottomleft',
        imperial: false
      }).addTo(mapRef.current);

      // Add custom controls for view modes
      const ViewControl = L.Control.extend({
        options: {
          position: 'topleft'
        },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
          container.style.background = 'rgba(17, 24, 39, 0.9)';
          container.style.padding = '4px';
          container.style.borderRadius = '4px';
          
          // Satellite toggle button
          const satButton = L.DomUtil.create('button', '', container);
          satButton.innerHTML = '🛰️';
          satButton.style.background = 'transparent';
          satButton.style.border = 'none';
          satButton.style.color = 'white';
          satButton.style.cursor = 'pointer';
          satButton.style.padding = '4px 8px';
          satButton.title = 'Toggle Satellite View';
          
          satButton.onclick = function() {
            if (mapRef.current) {
              const currentUrl = mapRef.current.eachLayer((layer: any) => {
                if (layer instanceof L.TileLayer) {
                  const url = layer._url;
                  if (url.includes('stadiamaps')) {
                    // Switch to satellite
                    mapRef.current?.removeLayer(layer);
                    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                      maxZoom: 20,
                      attribution: '© Esri'
                    }).addTo(mapRef.current!);
                  } else {
                    // Switch back to dark mode
                    mapRef.current?.removeLayer(layer);
                    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
                      maxZoom: 20,
                      attribution: '© Stadia Maps © OpenMapTiles © OpenStreetMap'
                    }).addTo(mapRef.current!);
                  }
                }
              });
            }
          };
          
          // Heatmap toggle button
          const heatButton = L.DomUtil.create('button', '', container);
          heatButton.innerHTML = '🔥';
          heatButton.style.background = 'transparent';
          heatButton.style.border = 'none';
          heatButton.style.color = 'white';
          heatButton.style.cursor = 'pointer';
          heatButton.style.padding = '4px 8px';
          heatButton.title = 'Toggle Heatmap';
          
          L.DomEvent.disableClickPropagation(container);
          return container;
        }
      });
      
      new ViewControl().addTo(mapRef.current);

      // Style overrides for dark theme
      const style = document.createElement('style');
      style.textContent = `
        .leaflet-container {
          background: #0a0a0a;
          font-family: inherit;
        }
        .leaflet-control-zoom a {
          background: rgba(17, 24, 39, 0.9) !important;
          color: white !important;
          border: 1px solid rgba(55, 65, 81, 0.5) !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(31, 41, 55, 0.9) !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(17, 24, 39, 0.95);
          color: white;
          border: 1px solid rgba(55, 65, 81, 0.5);
        }
        .leaflet-popup-tip {
          background: rgba(17, 24, 39, 0.95);
        }
      `;
      document.head.appendChild(style);
    }

    // Update map view when center/zoom changes
    if (mapRef.current) {
      mapRef.current.flyTo([center.lat, center.lng], zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom]);

  // Focus on region when it changes (from chat input)
  useEffect(() => {
    if (!mapRef.current || !focusedRegion) return;
    
    const regionBounds: Record<string, any> = {
      'brazil': { lat: -15.793889, lng: -47.882778, zoom: 5 },
      'chile': { lat: -33.4489, lng: -70.6693, zoom: 6 },
      'china': { lat: 35.86166, lng: 104.195397, zoom: 4 },
      'shanghai': { lat: 31.2304, lng: 121.4737, zoom: 10 },
      'singapore': { lat: 1.3521, lng: 103.8198, zoom: 11 },
      'usa': { lat: 37.0902, lng: -95.712891, zoom: 4 },
      'texas': { lat: 31.9686, lng: -99.9018, zoom: 6 },
      'europe': { lat: 54.5260, lng: 15.2551, zoom: 4 },
      'africa': { lat: -8.7832, lng: 34.5085, zoom: 3 },
      'asia': { lat: 34.0479, lng: 100.6197, zoom: 3 },
      'middle east': { lat: 29.2985, lng: 42.5510, zoom: 5 },
      'copper belt': { lat: -12.8275, lng: 28.2132, zoom: 7 },
      'soy': { lat: -15.793889, lng: -47.882778, zoom: 5 }, // Brazil soy region
      'port': { lat: 1.3521, lng: 103.8198, zoom: 4 }, // Major Asian ports
      'mine': { lat: -33.4489, lng: -70.6693, zoom: 5 }, // Chilean mining region
    };
    
    const region = focusedRegion.toLowerCase();
    for (const [key, bounds] of Object.entries(regionBounds)) {
      if (region.includes(key)) {
        mapRef.current.flyTo([bounds.lat, bounds.lng], bounds.zoom, {
          duration: 2,
          easeLinearity: 0.25
        });
        break;
      }
    }
  }, [focusedRegion]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add hotspot markers
    hotspots.forEach(hotspot => {
      // Determine color based on magnitude
      const color = hotspot.magnitude > 0.7 ? '#ef4444' : // red
                   hotspot.magnitude > 0.4 ? '#f59e0b' : // orange
                   '#22c55e'; // green

      // Create pulsing circle marker
      const marker = L.circleMarker([hotspot.lat, hotspot.lng], {
        radius: 8 + (hotspot.magnitude * 10),
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.4,
        className: 'pulse-marker'
      }).addTo(mapRef.current!);

      // Add glow effect
      const glowMarker = L.circleMarker([hotspot.lat, hotspot.lng], {
        radius: 15 + (hotspot.magnitude * 15),
        fillColor: color,
        color: 'transparent',
        fillOpacity: 0.2,
        className: 'glow-marker'
      }).addTo(mapRef.current!);

      // Bind popup
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; font-weight: 600;">${hotspot.name}</h4>
          <div style="color: #9ca3af; font-size: 12px;">
            <div>Magnitude: <span style="color: ${color}; font-weight: 500;">${hotspot.magnitude.toFixed(2)}</span></div>
            <div>Status: ${hotspot.magnitude > 0.7 ? 'Critical' : hotspot.magnitude > 0.4 ? 'Warning' : 'Normal'}</div>
          </div>
        </div>
      `);

      // Handle click
      marker.on('click', () => {
        onAoiClick(hotspot);
        // Fly to clicked marker
        mapRef.current?.flyTo([hotspot.lat, hotspot.lng], 12, {
          duration: 1
        });
      });
      
      // Handle hover
      marker.on('mouseover', function() {
        this.setStyle({ 
          weight: 4,
          opacity: 1,
          fillOpacity: 0.7
        });
        glowMarker.setStyle({
          radius: 20 + (hotspot.magnitude * 20),
          fillOpacity: 0.3
        });
      });
      
      marker.on('mouseout', function() {
        this.setStyle({ 
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4
        });
        glowMarker.setStyle({
          radius: 15 + (hotspot.magnitude * 15),
          fillOpacity: 0.2
        });
      });

      markersRef.current.push(marker);
      markersRef.current.push(glowMarker);
    });

    // Add pulsing animation styles
    if (!document.getElementById('map-animations')) {
      const animationStyle = document.createElement('style');
      animationStyle.id = 'map-animations';
      animationStyle.textContent = `
        @keyframes pulse {
          0% {
            stroke-opacity: 0.8;
            stroke-width: 2;
          }
          50% {
            stroke-opacity: 0.4;
            stroke-width: 4;
          }
          100% {
            stroke-opacity: 0.8;
            stroke-width: 2;
          }
        }
        .pulse-marker {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes glow {
          0% {
            fill-opacity: 0.2;
            transform: scale(1);
          }
          50% {
            fill-opacity: 0.1;
            transform: scale(1.2);
          }
          100% {
            fill-opacity: 0.2;
            transform: scale(1);
          }
        }
        .glow-marker {
          animation: glow 3s ease-in-out infinite;
          transform-origin: center;
        }
      `;
      document.head.appendChild(animationStyle);
    }
  }, [hotspots, onAoiClick]);

  // Highlight selected AOI
  useEffect(() => {
    if (!mapRef.current || !selectedAoi) return;

    // Find and highlight the selected marker
    markersRef.current.forEach(marker => {
      if (marker instanceof L.CircleMarker) {
        const latlng = marker.getLatLng();
        if (Math.abs(latlng.lat - selectedAoi.lat) < 0.01 && 
            Math.abs(latlng.lng - selectedAoi.lng) < 0.01) {
          marker.setStyle({ 
            weight: 4,
            opacity: 1,
            fillOpacity: 0.6 
          });
        }
      }
    });
  }, [selectedAoi]);

  return (
    <div 
      id="intelligence-map" 
      className="w-full h-full"
      style={{ background: '#0a0a0a' }}
    />
  );
}
