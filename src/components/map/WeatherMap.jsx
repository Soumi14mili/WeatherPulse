import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useWeatherContext } from '../../context/WeatherContext';
import { useTheme } from '../../context/ThemeContext';
import { reverseGeocode } from '../../services/geocodingService';
import { fetchCurrentWeather } from '../../services/weatherService';
import { mapStyleDark, mapStyleLight } from '../../utils/mapStyles';
import { MapPin, Info, AlertCircle, Compass, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function WeatherMap() {
  const mapRef = useRef(null);
  const { location, setLocation, weatherData } = useWeatherContext();
  const { isDark } = useTheme();
  
  const [mapInstance, setMapInstance] = useState(null);
  const [markerInstance, setMarkerInstance] = useState(null);
  const [infoWindowInstance, setInfoWindowInstance] = useState(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  // Read API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isKeyInvalid = !apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

  useEffect(() => {
    if (isKeyInvalid) {
      setApiKeyMissing(true);
      setMapLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load()
      .then((google) => {
        setMapLoading(false);
        const defaultCenter = location && location.lat && location.lon 
          ? { lat: parseFloat(location.lat), lng: parseFloat(location.lon) }
          : { lat: 40.7128, lng: -74.0060 }; // Default New York

        const map = new google.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 8,
          styles: isDark ? mapStyleDark : mapStyleLight,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'cooperative'
        });

        const marker = new google.maps.Marker({
          position: defaultCenter,
          map: map,
          animation: google.maps.Animation.DROP,
          title: location?.name || 'Active Location'
        });

        const infoWindow = new google.maps.InfoWindow();

        setMapInstance(map);
        setMarkerInstance(marker);
        setInfoWindowInstance(infoWindow);

        // Add map click listener
        map.addListener('click', async (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          
          // Show a temporary loading toast
          const loadingToast = toast.loading('Fetching weather for tapped location...');
          
          try {
            // 1. Reverse geocode coordinates to get location details
            const geoInfo = await reverseGeocode(lat, lng);
            
            // 2. Fetch current weather for tapped location
            const rawWeather = await fetchCurrentWeather(lat, lng);
            
            toast.dismiss(loadingToast);

            const temp = Math.round(rawWeather.current.temperature_2m);
            
            // Create content for InfoWindow
            const contentString = `
              <div style="font-family: 'Inter', sans-serif; padding: 8px 4px; min-width: 180px; color: #1e293b;">
                <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${geoInfo.name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">${geoInfo.country || ''}</p>
                <div style="display: flex; align-items: center; gap: 8px; margin: 10px 0;">
                  <span style="font-size: 24px; font-weight: 800; color: #2563eb;">${temp}°C</span>
                </div>
                <button 
                  id="info-select-btn" 
                  style="
                    width: 100%;
                    padding: 8px 12px;
                    background-color: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s;
                    margin-top: 4px;
                  "
                >
                  Set as Active City
                </button>
              </div>
            `;

            infoWindow.setContent(contentString);
            infoWindow.setPosition(e.latLng);
            infoWindow.open(map);

            // Listen to DOM ready of InfoWindow to bind click event to button
            google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
              const btn = document.getElementById('info-select-btn');
              if (btn) {
                btn.addEventListener('click', () => {
                  setLocation({
                    lat: geoInfo.latitude,
                    lng: geoInfo.longitude,
                    name: geoInfo.name,
                    country: geoInfo.country
                  });
                  infoWindow.close();
                  toast.success(`Active city set to ${geoInfo.name}!`);
                });
              }
            });

          } catch (err) {
            console.error('Map click fetch error:', err);
            toast.dismiss(loadingToast);
            toast.error('Failed to get weather for selected coordinate');
          }
        });
      })
      .catch((e) => {
        console.error('Failed to load Google Maps SDK', e);
        setMapLoading(false);
      });
  }, [isKeyInvalid, apiKey]);

  // Update center & marker position when active context location changes
  useEffect(() => {
    if (mapInstance && markerInstance && location && location.lat && location.lon) {
      const pos = { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
      mapInstance.panTo(pos);
      markerInstance.setPosition(pos);
      markerInstance.setTitle(location.name);

      if (infoWindowInstance) {
        infoWindowInstance.close();
      }
    }
  }, [location, mapInstance, markerInstance, infoWindowInstance]);

  // Dynamically update map theme
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setOptions({
        styles: isDark ? mapStyleDark : mapStyleLight
      });
    }
  }, [isDark, mapInstance]);

  // Center on user's physical location
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (mapInstance) {
            mapInstance.panTo({ lat, lng });
            mapInstance.setZoom(11);
          }

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

  if (apiKeyMissing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full h-full p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <div className="p-4 bg-orange-500/10 rounded-full mb-4">
          <AlertCircle size={48} className="text-orange-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-200">Google Maps Key Needed</h2>
        <p className="max-w-md text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
          Please define your Google Maps API key in the project root's <strong>.env</strong> file:
        </p>
        <div className="bg-slate-100 dark:bg-slate-800 font-mono text-xs px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 select-all mb-6">
          VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Make sure your API key has the <strong>Maps JavaScript API</strong> enabled in the Google Cloud Console.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[450px] md:min-h-[550px] rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800/50">
      {mapLoading && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 z-50 flex flex-col items-center justify-center">
          <Compass size={40} className="text-blue-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading Map Engine...</p>
        </div>
      )}
      
      {/* Map Target Element */}
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: 'inherit' }} />

      {/* Floating map controls */}
      <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-all font-medium flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
          title="Locate Me"
        >
          <MapPin size={18} className="text-blue-500" />
          <span className="text-xs">Find Me</span>
        </button>
      </div>

      {/* Instruction Toast Overlay */}
      <div className="absolute top-20 left-4 z-40 max-w-xs bg-slate-900/90 dark:bg-slate-950/90 text-white rounded-xl p-3 shadow-lg border border-white/10 backdrop-blur-md hidden sm:flex items-start gap-2.5">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold mb-0.5">Explore Weather</h4>
          <p className="text-[10px] text-slate-300 leading-normal">
            Click anywhere on the map to instantly query weather data and select locations.
          </p>
        </div>
      </div>
    </div>
  );
}
