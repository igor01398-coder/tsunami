
export interface SimulationParams {
  slopeAngle: number; // 1 to 10 (Gentle to Steep)
  waveIntensity: number; // 1 to 10 (Low to High)
}

export interface AnalysisResult {
  markdown: string;
  recommendedSeawallHeight: number; // in meters
  estimatedWaveHeight: number; // in meters (New field)
}

export interface MapLocation {
  title: string;
  uri: string;
}

export enum ImageResolution {
  RES_1K = "1K",
  RES_2K = "2K",
  RES_4K = "4K"
}

export interface GeneratedImage {
  url: string;
  resolution: ImageResolution;
}

export interface LocationData {
  name: string;
  lat: number;
  lng: number;
  depthMeters: number;
  slopeScore: number; // 1-10 mapped value
  isLand: boolean;
}

export interface SimulationRecord {
  id: string;
  timestamp: number;
  locationName: string;
  params: {
    slope: number;
    intensity: number;
    depth: number;
  };
  result: {
    recommendedHeight: number;
    waveHeight: number;
  };
}
