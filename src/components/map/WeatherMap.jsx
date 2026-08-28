import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWeatherContext } from '../../context/WeatherContext';
import { useTheme } from '../../context/ThemeContext';
import { reverseGeocode } from '../../services/geocodingService';
import { fetchCurrentWeather } from '../../services/weatherService';
import { MapPin, Navigation, Info } from 'lucide-react';
import toast from 'react-hot-toast';

// Fix for default Leaflet marker icons which fail under bundlers like Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically pan map center
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 9, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

// Component to capture map clicks
function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function WeatherMap() {
  const { location, setLocation } = useWeatherContext();
  const { isDark } = useTheme();
  
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default New York
  const [clickedLocation, setClickedLocation] = useState(null);
  const [clickedWeatherData, setClickedWeatherData] = useState(null);
  const [fetchingClicked, setFetchingClicked] = useState(false);

  // Sync center when context location changes
  useEffect(() => {
    if (location && location.lat && location.lon) {
      setMapCenter([location.lat, location.lon]);
    }
  }, [location]);

  // Handle map click
  const handleMapClick = async (lat, lng) => {
    setFetchingClicked(true);
    setClickedLocation(null);
    setClickedWeatherData(null);
    
    const loadingToast = toast.loading('Fetching weather for tapped location...');
    
    try {
      // 1. Reverse geocode
      const geoInfo = await reverseGeocode(lat, lng);
      
      // 2. Fetch current weather
      const rawWeather = await fetchCurrentWeather(lat, lng);
      
      toast.dismiss(loadingToast);
      
      setClickedLocation(geoInfo);
      setClickedWeatherData({
        temp: Math.round(rawWeather.current.temperature_2m),
        condition: rawWeather.current.weather_code // code can be translated or displayed
      });
    } catch (err) {
      console.error('Error fetching tapped weather:', err);
      toast.dismiss(loadingToast);
      toast.error('Failed to get weather details for this location.');
    } finally {
      setFetchingClicked(false);
    }
  };

  const handleSetCity = () => {
    if (clickedLocation) {
      setLocation({
        lat: clickedLocation.latitude,
        lng: clickedLocation.longitude,
        name: clickedLocation.name,
        country: clickedLocation.country
      });
      setClickedLocation(null);
      setClickedWeatherData(null);
      toast.success(`Active city set to ${clickedLocation.name}!`);
    }
  };

  // Select dynamic tiles
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  // Locate user physically
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMapCenter([lat, lng]);

          try {
            const geoInfo = await reverseGeocode(lat, lng);
            setLocation({
              lat: lat,
              lng: lng,
              name: geoInfo.name,
              country: geoInfo.country
            });
            toast.success(`Centered on current location: ${geoInfo.name}`);
          } catch (e) {
            setLocation({ lat, lng, name: 'Current Location', country: '' });
            toast.success('Centered on current location');
          }
        },
        () => {
          toast.error('Location access denied or unavailable.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="relative w-full h-full min-h-[450px] md:min-h-[550px] rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800/50">
      
      <MapContainer 
        center={mapCenter} 
        zoom={8} 
        className="w-full h-full" 
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />
        
        <MapUpdater center={mapCenter} />
        <MapEventsHandler onMapClick={handleMapClick} />

        {/* Current Active Location Pin */}
        {location && location.lat && location.lon && (
          <Marker position={[location.lat, location.lon]}>
            <Popup>
              <div className="text-center p-1 font-sans text-slate-800">
                <h4 className="font-bold text-sm leading-tight">{location.name}</h4>
                <span className="text-[10px] text-slate-500 font-medium">{location.country || ''}</span>
                <p className="text-[11px] font-semibold text-blue-500 mt-1">Active Dashboard City</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dynamic clicked location popup */}
        {clickedLocation && clickedWeatherData && (
          <Popup 
            position={[clickedLocation.latitude, clickedLocation.longitude]}
            onClose={() => {
              setClickedLocation(null);
              setClickedWeatherData(null);
            }}
          >
            <div className="p-1 font-sans text-slate-800 min-w-[140px]">
              <h4 className="font-bold text-sm leading-tight m-0">{clickedLocation.name}</h4>
              <span className="text-[10px] text-slate-500 block mb-2">{clickedLocation.country || ''}</span>
              
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {clickedWeatherData.temp}°C
                </span>
              </div>
              
              <button 
                onClick={handleSetCity}
                className="w-full py-1.5 px-3 bg-blue-600 text-white border-0 rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
              >
                Set as Active City
              </button>
            </div>
          </Popup>
        )}
      </MapContainer>

      {/* Locate Me Button Overlay */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-700 transition-all font-medium flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
          title="Locate Me"
        >
          <Navigation size={16} className="text-blue-500 fill-blue-500 animate-pulse" />
          <span className="text-xs font-semibold">Find Me</span>
        </button>
      </div>

      {/* Interactive Info Banner Overlay */}
      <div className="absolute top-20 left-4 z-[1000] max-w-xs bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-xl p-3 shadow-lg border border-white/10 backdrop-blur-md hidden sm:flex items-start gap-2.5">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold mb-0.5">Explore Weather Map</h4>
          <p className="text-[10px] text-slate-300 leading-normal">
            Click anywhere on the map to query the local weather and select a city for your dashboard!
          </p>
        </div>
      </div>
    </div>
  );
}
