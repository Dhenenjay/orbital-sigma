// Shared TypeScript types used by both frontend and backend

// Area of Interest (AOI)
export type AOI = {
  id: string;
  name: string;
  // GeoJSON Polygon or MultiPolygon in WGS84
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  // Optional properties like owner or createdAt
  properties?: Record<string, unknown>;
};

// Signals represent computed indicators/statistics over an AOI
export type Signal = {
  key: string; // e.g., 'ndvi_mean', 'precip_total'
  label: string;
  unit?: string; // e.g., '%', 'mm'
  // Time series or scalar value
  value?: number;
  series?: { timestamp: string; value: number }[];
};

// Query parameters for requesting signals over an AOI
export type Query = {
  aoiId: string;
  // ISO8601 date strings
  start?: string;
  end?: string;
  // Signal keys to compute
  signals: string[];
  // Optional spatial/temporal resolution settings
  resolutionMeters?: number;
  interval?: 'daily' | 'weekly' | 'monthly' | 'annual';
};

