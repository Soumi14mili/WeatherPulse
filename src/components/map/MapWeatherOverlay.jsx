import React from 'react';
import { TileLayer } from 'react-leaflet';

/**
 * Weather tile overlay layers using OpenWeatherMap tiles.
 * Gracefully renders nothing if no API key is configured.
 *
 * Layer types:
 *   'precipitation_new'  — Rain/precipitation radar
 *   'clouds_new'         — Cloud cover
 *   'temp_new'           — Temperature heat map
 *   'wind_new'           — Wind speed
 *   'pressure_new'       — Atmospheric pressure
 */

const OWM_KEY = import.meta.env.VITE_OWM_API_KEY;

const LAYER_CONFIGS = {
  rain: {
    id: 'precipitation_new',
    label: '🌧️ Precipitation',
    opacity: 0.7,
  },
  clouds: {
    id: 'clouds_new',
    label: '☁️ Clouds',
    opacity: 0.55,
  },
  temp: {
    id: 'temp_new',
    label: '🌡️ Temperature',
    opacity: 0.6,
  },
  wind: {
    id: 'wind_new',
    label: '💨 Wind',
    opacity: 0.65,
  },
};

export { LAYER_CONFIGS };

export default function MapWeatherOverlay({ activeLayer }) {
  if (!activeLayer || activeLayer === 'none') return null;
  
  const config = LAYER_CONFIGS[activeLayer];
  if (!config) return null;

  // Without a key, use a free alternative for rain (rainviewer)
  if (!OWM_KEY || OWM_KEY === 'your_openweathermap_api_key_here') {
    if (activeLayer === 'rain') {
      // RainViewer free radar — no API key needed
      return (
        <TileLayer
          url="https://tilecache.rainviewer.com/v2/coverage/0/256/{z}/{x}/{y}/2/1_1.png"
          attribution="RainViewer"
          opacity={0.5}
          zIndex={500}
        />
      );
    }
    return null; // Other layers need OWM key
  }

  const tileUrl = `https://tile.openweathermap.org/map/${config.id}/{z}/{x}/{y}.png?appid=${OWM_KEY}`;

  return (
    <TileLayer
      url={tileUrl}
      attribution='&copy; <a href="https://openweathermap.org">OpenWeatherMap</a>'
      opacity={config.opacity}
      zIndex={500}
    />
  );
}
