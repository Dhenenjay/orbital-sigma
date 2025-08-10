import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Aoi {
  id: string;
  name: string;
  type: 'port' | 'farm' | 'mine' | 'energy';
  bbox: number[]; // [minLng, minLat, maxLng, maxLat]
  description?: string;
  center?: [number, number]; // Optional center point
  geometry?: any; // Optional GeoJSON geometry
}

interface AoiMapProps {
  aois: Aoi[];
  selectedAoi?: Aoi | null;
  onAoiClick?: (aoi: Aoi) => void;
  height?: string;
  showLabels?: boolean;
  enableClustering?: boolean;
}

// Color scheme for different AOI types
const AOI_COLORS = {
  port: '#3b82f6',    // Blue
  farm: '#10b981',    // Green
  mine: '#f59e0b',    // Amber
  energy: '#ef4444',  // Red
};

// Icons for different AOI types
const AOI_ICONS = {
  port: '⚓',
  farm: '🌾',
  mine: '⛏️',
  energy: '⚡',
};

export default function AoiMap({
  aois,
  selectedAoi,
  onAoiClick,
  height = '500px',
  showLabels = true,
  enableClustering = false,
}: AoiMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [0, 20], // Default center
      zoom: 2,
      attributionControl: true,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add scale control
    map.current.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 200,
        unit: 'metric',
      }),
      'bottom-left'
    );

    // Mark as loaded
    map.current.on('load', () => {
      setIsLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add AOIs to map
  useEffect(() => {
    if (!map.current || !isLoaded || !aois.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Clear existing popup
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    // Create GeoJSON feature collection
    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: aois.map(aoi => {
        // Calculate center from bbox if not provided
        const center = aoi.center || [
          (aoi.bbox[0] + aoi.bbox[2]) / 2,
          (aoi.bbox[1] + aoi.bbox[3]) / 2,
        ];

        // Create polygon from bbox
        const polygon = {
          type: 'Polygon' as const,
          coordinates: [[
            [aoi.bbox[0], aoi.bbox[1]], // SW
            [aoi.bbox[2], aoi.bbox[1]], // SE
            [aoi.bbox[2], aoi.bbox[3]], // NE
            [aoi.bbox[0], aoi.bbox[3]], // NW
            [aoi.bbox[0], aoi.bbox[1]], // Close polygon
          ]],
        };

        return {
          type: 'Feature',
          properties: {
            id: aoi.id,
            name: aoi.name,
            type: aoi.type,
            description: aoi.description || '',
            color: AOI_COLORS[aoi.type],
            icon: AOI_ICONS[aoi.type],
          },
          geometry: aoi.geometry || polygon,
        };
      }),
    };

    // Add source for AOI polygons
    if (map.current.getSource('aoi-polygons')) {
      (map.current.getSource('aoi-polygons') as maplibregl.GeoJSONSource).setData(geojsonData);
    } else {
      map.current.addSource('aoi-polygons', {
        type: 'geojson',
        data: geojsonData,
      });
    }

    // Add fill layer for polygons
    if (!map.current.getLayer('aoi-fill')) {
      map.current.addLayer({
        id: 'aoi-fill',
        type: 'fill',
        source: 'aoi-polygons',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.5,
            0.3,
          ],
        },
      });
    }

    // Add outline layer for polygons
    if (!map.current.getLayer('aoi-outline')) {
      map.current.addLayer({
        id: 'aoi-outline',
        type: 'line',
        source: 'aoi-polygons',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            3,
            2,
          ],
        },
      });
    }

    // Add markers for AOI centers
    aois.forEach(aoi => {
      const center = aoi.center || [
        (aoi.bbox[0] + aoi.bbox[2]) / 2,
        (aoi.bbox[1] + aoi.bbox[3]) / 2,
      ];

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'aoi-marker';
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${AOI_COLORS[aoi.type]};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          ${AOI_ICONS[aoi.type]}
        </div>
      `;

      // Create marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(center as [number, number])
        .addTo(map.current!);

      // Add click handler
      el.addEventListener('click', () => {
        if (onAoiClick) {
          onAoiClick(aoi);
        }

        // Show popup
        if (popupRef.current) {
          popupRef.current.remove();
        }

        popupRef.current = new maplibregl.Popup({ offset: 25 })
          .setLngLat(center as [number, number])
          .setHTML(`
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
                ${aoi.name}
              </h3>
              <div style="color: #6b7280; font-size: 14px;">
                <div>${AOI_ICONS[aoi.type]} ${aoi.type.charAt(0).toUpperCase() + aoi.type.slice(1)}</div>
                ${aoi.description ? `<div style="margin-top: 4px;">${aoi.description}</div>` : ''}
                <div style="margin-top: 4px; font-size: 12px;">ID: ${aoi.id}</div>
              </div>
            </div>
          `)
          .addTo(map.current!);
      });

      // Add label if enabled
      if (showLabels) {
        const labelEl = document.createElement('div');
        labelEl.className = 'aoi-label';
        labelEl.innerHTML = `
          <div style="
            background: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            white-space: nowrap;
            margin-top: 36px;
          ">
            ${aoi.name}
          </div>
        `;
        el.appendChild(labelEl);
      }

      markersRef.current.push(marker);
    });

    // Add hover effects for polygons
    let hoveredStateId: string | null = null;

    map.current.on('mousemove', 'aoi-fill', (e) => {
      if (e.features && e.features.length > 0) {
        if (hoveredStateId) {
          map.current!.setFeatureState(
            { source: 'aoi-polygons', id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = e.features[0].properties.id;
        map.current!.setFeatureState(
          { source: 'aoi-polygons', id: hoveredStateId },
          { hover: true }
        );
        map.current!.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'aoi-fill', () => {
      if (hoveredStateId) {
        map.current!.setFeatureState(
          { source: 'aoi-polygons', id: hoveredStateId },
          { hover: false }
        );
      }
      hoveredStateId = null;
      map.current!.getCanvas().style.cursor = '';
    });

    // Click handler for polygons
    map.current.on('click', 'aoi-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const aoi = aois.find(a => a.id === feature.properties.id);
        if (aoi && onAoiClick) {
          onAoiClick(aoi);
        }
      }
    });

    // Fit map to show all AOIs
    if (aois.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      aois.forEach(aoi => {
        bounds.extend([aoi.bbox[0], aoi.bbox[1]]);
        bounds.extend([aoi.bbox[2], aoi.bbox[3]]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [aois, isLoaded, showLabels, onAoiClick]);

  // Handle selected AOI
  useEffect(() => {
    if (!map.current || !selectedAoi) return;

    // Zoom to selected AOI
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([selectedAoi.bbox[0], selectedAoi.bbox[1]]);
    bounds.extend([selectedAoi.bbox[2], selectedAoi.bbox[3]]);
    map.current.fitBounds(bounds, { 
      padding: 100,
      duration: 1000,
    });

    // Show popup for selected AOI
    const center = selectedAoi.center || [
      (selectedAoi.bbox[0] + selectedAoi.bbox[2]) / 2,
      (selectedAoi.bbox[1] + selectedAoi.bbox[3]) / 2,
    ];

    if (popupRef.current) {
      popupRef.current.remove();
    }

    popupRef.current = new maplibregl.Popup({ offset: 25 })
      .setLngLat(center as [number, number])
      .setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
            ${selectedAoi.name}
          </h3>
          <div style="color: #6b7280; font-size: 14px;">
            <div>${AOI_ICONS[selectedAoi.type]} ${selectedAoi.type.charAt(0).toUpperCase() + selectedAoi.type.slice(1)}</div>
            ${selectedAoi.description ? `<div style="margin-top: 4px;">${selectedAoi.description}</div>` : ''}
            <div style="margin-top: 4px; font-size: 12px;">ID: ${selectedAoi.id}</div>
          </div>
        </div>
      `)
      .addTo(map.current);
  }, [selectedAoi]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: 8,
          overflow: 'hidden',
        }} 
      />
      
      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'white',
        padding: 12,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: 14,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>AOI Types</div>
        {Object.entries(AOI_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            <div style={{
              width: 16,
              height: 16,
              background: color,
              borderRadius: '50%',
              marginRight: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
            }}>
              {AOI_ICONS[type as keyof typeof AOI_ICONS]}
            </div>
            <span style={{ textTransform: 'capitalize' }}>{type}</span>
          </div>
        ))}
      </div>

      {/* AOI count */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        background: 'white',
        padding: '8px 12px',
        borderRadius: 6,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: 13,
        fontWeight: 500,
      }}>
        {aois.length} AOI{aois.length !== 1 ? 's' : ''} displayed
      </div>
    </div>
  );
}
