import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWeatherContext } from '../../context/WeatherContext';
import { useTheme } from '../../context/ThemeContext';
import { reverseGeocode } from '../../services/geocodingService';
import { fetchCurrentWeather } from '../../services/weatherService';
import { Navigation, Info, Layers, Droplets, Wind, Thermometer, Cloud, X } from 'lucide-react';
import toast from 'react-hot-toast';
import MapWeatherOverlay, { LAYER_CONFIGS } from './MapWeatherOverlay';
import { getWeatherInfo } from '../../utils/weatherCodes';

// ── Fix Leaflet default icon path issue in Vite ──────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Custom pulsing GPS blue dot marker ───────────────────────────────────────
const createPulsingDotIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:rgba(59,130,246,0.25);
          animation:gpsPulse 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;
          width:14px;height:14px;
          transform:translate(-50%,-50%);
          border-radius:50%;
          background:#3b82f6;
          border:2.5px solid white;
          box-shadow:0 0 10px rgba(59,130,246,0.6);
        "></div>
      </div>
      <style>
        @keyframes gpsPulse {
          0%   { transform:scale(1); opacity:0.8; }
          100% { transform:scale(3.5); opacity:0; }
        }
      </style>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -14],
  });

// ── Custom active city marker (pin shape) ────────────────────────────────────
const createActiveCityIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width:28px;height:38px;position:relative;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));
      ">
        <svg viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 14 24 14 24S28 23.625 28 14C28 6.268 21.732 0 14 0z"
            fill="#6366f1"/>
          <circle cx="14" cy="14" r="7" fill="white" fill-opacity="0.95"/>
          <circle cx="14" cy="14" r="4" fill="#6366f1"/>
        </svg>
      </div>
    `,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  });

// ── MapUpdater: smoothly pan to new center ────────────────────────────────────
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 9, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

// ── MapEventsHandler: capture clicks ─────────────────────────────────────────
function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Weather condition emoji ───────────────────────────────────────────────────
function getWeatherEmoji(code) {
  if (code === 0 || code === 1) return '☀️';
  if (code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌦️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

// ── Main WeatherMap component ─────────────────────────────────────────────────
export default function WeatherMap() {
  const { location, setLocation } = useWeatherContext();
  const { isDark } = useTheme();

  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [gpsLocation, setGpsLocation] = useState(null);  // Pulsing dot position
  const [gpsAccuracy, setGpsAccuracy] = useState(null);  // Accuracy circle radius
  const [clickedLocation, setClickedLocation] = useState(null);
  const [clickedWeatherData, setClickedWeatherData] = useState(null);
  const [fetchingClicked, setFetchingClicked] = useState(false);
  const [activeLayer, setActiveLayer] = useState('none');
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Sync center when context location changes
  useEffect(() => {
    if (location?.lat && (location?.lon || location?.lng)) {
      setMapCenter([location.lat, location.lon ?? location.lng]);
    }
  }, [location]);

  // ── Handle map click → fetch weather ───────────────────────────────────────
  const handleMapClick = async (lat, lng) => {
    if (fetchingClicked) return;
    setFetchingClicked(true);
    setClickedLocation(null);
    setClickedWeatherData(null);

    const loadingToast = toast.loading('Fetching weather…');
    try {
      const [geoInfo, rawWeather] = await Promise.all([
        reverseGeocode(lat, lng),
        fetchCurrentWeather(lat, lng),
      ]);
      toast.dismiss(loadingToast);

      const code = rawWeather.current.weather_code;
      const weatherInfo = getWeatherInfo(code, rawWeather.current.is_day);

      setClickedLocation({ ...geoInfo, lat, lng });
      setClickedWeatherData({
        temp: Math.round(rawWeather.current.temperature_2m),
        feelsLike: Math.round(rawWeather.current.apparent_temperature),
        humidity: rawWeather.current.relative_humidity_2m,
        windSpeed: Math.round(rawWeather.current.wind_speed_10m),
        condition: weatherInfo.description,
        code,
        isDay: rawWeather.current.is_day,
      });
    } catch (err) {
      console.error('Error fetching tapped weather:', err);
      toast.dismiss(loadingToast);
      toast.error('Could not get weather for this location.');
    } finally {
      setFetchingClicked(false);
    }
  };

  // ── Set clicked location as dashboard city ─────────────────────────────────
  const handleSetCity = () => {
    if (clickedLocation) {
      setLocation({
        lat: clickedLocation.lat,
        lng: clickedLocation.lng,
        lon: clickedLocation.lng,
        name: clickedLocation.name,
        country: clickedLocation.country,
      });
      setClickedLocation(null);
      setClickedWeatherData(null);
      toast.success(`Active city set to ${clickedLocation.name}!`);
    }
  };

  // ── GPS Locate Me ───────────────────────────────────────────────────────────
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser.');
      return;
    }
    toast.loading('Finding your location…', { id: 'gps' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy; // metres

        setMapCenter([lat, lng]);
        setGpsLocation([lat, lng]);
        setGpsAccuracy(accuracy);
        toast.dismiss('gps');

        try {
          const geoInfo = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, lon: lng, name: geoInfo.name, country: geoInfo.country });
          toast.success(`📍 Located: ${geoInfo.name}`);
        } catch {
          setLocation({ lat, lng, lon: lng, name: 'Current Location', country: '' });
          toast.success('📍 Centered on your location');
        }
      },
      () => {
        toast.dismiss('gps');
        toast.error('Location access denied or unavailable.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // ── Tile URLs ───────────────────────────────────────────────────────────────
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const activeCityIcon = createActiveCityIcon();
  const pulsingDotIcon = createPulsingDotIcon();

  const layerButtons = [
    { key: 'rain',   icon: <Droplets size={14} />, label: 'Rain' },
    { key: 'clouds', icon: <Cloud size={14} />,    label: 'Clouds' },
    { key: 'temp',   icon: <Thermometer size={14}/>, label: 'Temp' },
    { key: 'wind',   icon: <Wind size={14} />,     label: 'Wind' },
  ];

  return (
    <div className="relative w-full h-full min-h-[450px] md:min-h-[600px] rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800/50">

      {/* ── Main Map ─────────────────────────────────────────────────────── */}
      <MapContainer
        center={mapCenter}
        zoom={8}
        className="w-full h-full"
        zoomControl={false}
        style={{ minHeight: '450px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />

        {/* Weather overlay layer */}
        <MapWeatherOverlay activeLayer={activeLayer} />

        <MapUpdater center={mapCenter} />
        <MapEventsHandler onMapClick={handleMapClick} />

        {/* GPS pulsing dot + accuracy circle */}
        {gpsLocation && (
          <>
            {gpsAccuracy && gpsAccuracy < 5000 && (
              <Circle
                center={gpsLocation}
                radius={gpsAccuracy}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: '4 4',
                }}
              />
            )}
            <Marker position={gpsLocation} icon={pulsingDotIcon}>
              <Popup>
                <div className="text-center font-sans text-slate-800 text-xs p-1">
                  <p className="font-bold">📍 You are here</p>
                  {gpsAccuracy && (
                    <p className="text-slate-500 mt-0.5">±{Math.round(gpsAccuracy)}m accuracy</p>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Active dashboard city marker */}
        {location?.lat && (location?.lon || location?.lng) && (
          <Marker
            position={[location.lat, location.lon ?? location.lng]}
            icon={activeCityIcon}
          >
            <Popup>
              <div className="text-center p-1 font-sans text-slate-800 min-w-[120px]">
                <h4 className="font-bold text-sm leading-tight">{location.name}</h4>
                {location.country && (
                  <span className="text-[10px] text-slate-500 font-medium">{location.country}</span>
                )}
                <p className="text-[11px] font-semibold text-indigo-500 mt-1">Active Dashboard City</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Clicked location rich weather popup */}
        {clickedLocation && clickedWeatherData && (
          <Popup
            position={[clickedLocation.lat, clickedLocation.lng]}
            onClose={() => {
              setClickedLocation(null);
              setClickedWeatherData(null);
            }}
          >
            <div className="font-sans text-slate-800 min-w-[180px] p-0.5">
              {/* Header */}
              <div className="mb-2">
                <h4 className="font-bold text-sm leading-tight m-0">{clickedLocation.name}</h4>
                {clickedLocation.country && (
                  <span className="text-[10px] text-slate-500 block">{clickedLocation.country}</span>
                )}
              </div>

              {/* Main temp row */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl leading-none">
                  {getWeatherEmoji(clickedWeatherData.code)}
                </span>
                <div>
                  <div className="text-2xl font-black text-blue-600 leading-none">
                    {clickedWeatherData.temp}°C
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Feels {clickedWeatherData.feelsLike}°C
                  </div>
                </div>
              </div>

              {/* Condition */}
              <div className="text-[11px] font-semibold text-slate-600 mb-3 capitalize">
                {clickedWeatherData.condition}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                <div className="bg-blue-50 rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-slate-500 font-medium">Humidity</div>
                  <div className="text-[11px] font-bold text-blue-600">{clickedWeatherData.humidity}%</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                  <div className="text-[9px] text-slate-500 font-medium">Wind</div>
                  <div className="text-[11px] font-bold text-slate-700">{clickedWeatherData.windSpeed} km/h</div>
                </div>
              </div>

              {/* Set city button */}
              <button
                onClick={handleSetCity}
                className="w-full py-2 px-3 bg-indigo-600 text-white border-0 rounded-xl text-[11px] font-semibold hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer shadow-sm shadow-indigo-500/30"
              >
                Set as Active City
              </button>
            </div>
          </Popup>
        )}

        {/* Loading indicator popup */}
        {fetchingClicked && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl px-5 py-3 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 backdrop-blur-sm">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Fetching weather…</span>
            </div>
          </div>
        )}
      </MapContainer>

      {/* ── Layer Toggle Panel ────────────────────────────────────────────── */}
      <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-2">
        {/* Layers button */}
        <button
          onClick={() => setShowLayerPanel(p => !p)}
          className={`p-2.5 rounded-xl shadow-lg border transition-all font-medium flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 ${
            showLayerPanel
              ? 'bg-indigo-600 text-white border-indigo-700'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700'
          }`}
          title="Weather Layers"
        >
          <Layers size={16} />
          <span className="text-xs font-semibold">Layers</span>
        </button>

        {/* Layer panel */}
        {showLayerPanel && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden w-36">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overlay</p>
            </div>
            {/* None option */}
            <button
              onClick={() => setActiveLayer('none')}
              className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2 ${
                activeLayer === 'none'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-sm">🗺️</span>
              <span>None</span>
            </button>
            {layerButtons.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveLayer(prev => prev === key ? 'none' : key)}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2 ${
                  activeLayer === key
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-slate-500 dark:text-slate-400">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Find Me Button ─────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 right-4 z-[1000]">
        <button
          onClick={handleLocateMe}
          className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700 transition-all font-medium flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
          title="Locate Me"
        >
          <Navigation size={16} className="text-blue-500 fill-blue-500" />
          <span className="text-xs font-semibold">Find Me</span>
        </button>
      </div>

      {/* ── Info Banner ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-6 left-4 z-[1000] max-w-[200px] bg-slate-900/85 dark:bg-slate-950/90 text-white rounded-xl p-3 shadow-lg border border-white/10 backdrop-blur-md hidden sm:flex items-start gap-2.5">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-[10px] font-bold mb-0.5">Tap the map</h4>
          <p className="text-[9px] text-slate-300 leading-relaxed">
            Tap anywhere to see weather. Use layers for radar overlays.
          </p>
        </div>
      </div>
    </div>
  );
}
