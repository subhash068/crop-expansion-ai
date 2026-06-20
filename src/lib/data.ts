import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";

export type ParcelRow = {
  parcel_id: string;
  district: string;
  mandal: string;
  village: string;
  survey_no: string;
  latitude: number;
  longitude: number;
  parcel_area_acres: number;
  geometry_type: string;
  boundary_status: string;
  elevation_m: number;
  slope_percent: number;
  watershed_code: string;
  land_use_type: string;
};

export type GroundTruthRow = {
  parcel_id: string; district: string; mandal: string; village: string;
  survey_no: string; latitude: number; longitude: number;
  land_area_acres: number; irrigation_type: string; soil_type: string;
  season: string; year: number; crop_type: string; crop_stage: string;
  previous_crop: string;
};

export type SuitabilityRow = {
  parcel_id: string; season: string; year: number;
  soil_score: number; rainfall_score: number; temperature_score: number;
  irrigation_score: number; historical_yield_score: number;
  suitability_score: number; recommended_crop: string;
  diversification_potential: string; water_saving_percent: number;
};

export type SatelliteRow = {
  parcel_id: string; season: string; year: number;
  NDVI: number; EVI: number; SAVI: number; NDWI: number;
  Red: number; Green: number; Blue: number; NIR: number;
  SWIR1: number; SWIR2: number; cloud_cover_percent: number; image_source: string;
};

export type SoilRow = {
  parcel_id: string; season: string; year: number;
  soil_type: string; soil_texture: string; soil_depth_cm: number;
  pH: number; organic_carbon: number; nitrogen_kg_ha: number;
  phosphorus_kg_ha: number; potassium_kg_ha: number; sulphur_ppm: number;
  zinc_ppm: number; electrical_conductivity: number;
  drainage_class: string; soil_fertility_score: number;
};

export type YieldRow = {
  parcel_id: string; season: string; year: number; crop_type: string;
  cultivated_area_acres: number; production_kg: number;
  yield_kg_per_acre: number; market_price_per_kg: number;
  gross_income_rs: number; yield_category: string;
};

export type WeatherRow = {
  parcel_id: string; season: string; year: number;
  total_rainfall_mm: number; rainy_days: number;
  avg_temperature_c: number; max_temperature_c: number;
  min_temperature_c: number; avg_humidity_percent: number;
  avg_wind_speed_kmph: number; solar_radiation_mj: number;
  evapotranspiration_mm: number; drought_risk: string;
};

export type RotationRow = {
  parcel_id: string; season: string; year: number;
  year_2022_crop: string; year_2023_crop: string; year_2024_crop: string;
  current_crop: string; rotation_pattern: string;
  monocropping_flag: string; diversification_score: number;
  recommended_next_crop: string; recommendation_reason: string;
};

async function loadCsv<T>(file: string): Promise<T[]> {
  const cacheBuster = new Date().getTime();
  const res = await fetch(`/data/${file}?v=${cacheBuster}`);
  const text = await res.text();
  const parsed = Papa.parse<T>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return parsed.data as T[];
}

const opts = { staleTime: Infinity, gcTime: Infinity };

export const useParcels = () =>
  useQuery({ queryKey: ["parcels"], queryFn: () => loadCsv<ParcelRow>("Anantapur_Admin_Boundary_500_Connected.csv"), ...opts });
export const useGroundTruth = () =>
  useQuery({ queryKey: ["gt"], queryFn: () => loadCsv<GroundTruthRow>("Anantapur_Crop_GroundTruth_1500_ThreeSeasons.csv"), ...opts });
export const useSuitability = () =>
  useQuery({ queryKey: ["suit"], queryFn: () => loadCsv<SuitabilityRow>("Anantapur_Crop_Suitability_1500.csv"), ...opts });
export const useSatellite = () =>
  useQuery({ queryKey: ["sat"], queryFn: () => loadCsv<SatelliteRow>("Anantapur_Satellite_Features_1500.csv"), ...opts });
export const useSoil = () =>
  useQuery({ queryKey: ["soil"], queryFn: () => loadCsv<SoilRow>("Anantapur_Soil_Health_1500.csv"), ...opts });
export const useYield = () =>
  useQuery({ queryKey: ["yield"], queryFn: () => loadCsv<YieldRow>("Anantapur_Yield_1500.csv"), ...opts });
export const useWeather = () =>
  useQuery({ queryKey: ["weather"], queryFn: () => loadCsv<WeatherRow>("Anantapur_Weather_1500.csv"), ...opts });
export const useRotation = () =>
  useQuery({ queryKey: ["rotation"], queryFn: () => loadCsv<RotationRow>("Anantapur_Crop_Rotation_1500.csv"), ...opts });

export const useLiveWeather = (lat?: number, lon?: number) => {
  return useQuery({
    queryKey: ["liveWeather", lat, lon],
    queryFn: async () => {
      if (!lat || !lon) return null;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,rain_sum&timezone=Asia/Kolkata&forecast_days=14`);
      return res.json();
    },
    enabled: !!lat && !!lon,
  });
};

// Crop categories
export const MILLETS = ["Pearl Millet", "Foxtail Millet", "Finger Millet", "Sorghum", "Little Millet", "Kodo Millet"];
export const PULSES = ["Red Gram", "Green Gram", "Bengal Gram", "Black Gram", "Horse Gram"];
export const OILSEEDS = ["Groundnut", "Sunflower", "Sesame", "Castor", "Oil Palm", "Soybean"];

export function cropCategory(crop: string): "Millets" | "Pulses" | "Oilseeds" | "Cotton" | "Paddy" | "Other" {
  if (MILLETS.includes(crop)) return "Millets";
  if (PULSES.includes(crop)) return "Pulses";
  if (OILSEEDS.includes(crop)) return "Oilseeds";
  if (crop === "Cotton") return "Cotton";
  if (crop === "Paddy") return "Paddy";
  return "Other";
}

export function groupBy<T, K extends string>(rows: T[], keyFn: (r: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const r of rows) {
    const k = keyFn(r);
    (out[k] ||= []).push(r);
  }
  return out;
}

export function sum<T>(rows: T[], f: (r: T) => number): number {
  return rows.reduce((a, b) => a + (f(b) || 0), 0);
}

export function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
