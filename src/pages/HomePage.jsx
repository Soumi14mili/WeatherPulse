import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, AlertTriangle, MapPin, Clock, Share2, Download, Copy, Check } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { generateSummary } from '../utils/smartSummary';
import { getWeatherInfo } from '../utils/weatherCodes';
import PageWrapper from '../components/layout/PageWrapper';
import GlassCard from '../components/common/GlassCard';
import Skeleton from '../components/common/Skeleton';
import WeatherIcon from '../components/common/WeatherIcon';
import TemperatureWidget from '../components/dashboard/TemperatureWidget';
import WindWidget from '../components/dashboard/WindWidget';
import HumidityWidget from '../components/dashboard/HumidityWidget';
import PressureWidget from '../components/dashboard/PressureWidget';
import UVWidget from '../components/dashboard/UVWidget';
import SunWidget from '../components/dashboard/SunWidget';
import MoonWidget from '../components/dashboard/MoonWidget';
import VisibilityWidget from '../components/dashboard/VisibilityWidget';
import RainWidget from '../components/dashboard/RainWidget';
import { formatTime, formatDate } from '../utils/formatters';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../components/common/SortableItem';
import { useLocalStorage } from '../hooks/useLocalStorage';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function HomePage() {
  const { weatherData, airQualityData, location, loading, error } = useWeatherContext();
  const [copied, setCopied] = React.useState(false);
  const [widgetOrder, setWidgetOrder] = useLocalStorage('widgetOrder', [
    'temp', 'humidity', 'wind', 'pressure', 'uv', 'visibility', 'rain', 'aqi', 'sun', 'moon'
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (loading && !weatherData) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="p-4 bg-red-500/10 rounded-full mb-4">
            <AlertTriangle size={48} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-200">Error Loading Data</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
        </div>
      </PageWrapper>
    );
  }

  if (!location || !weatherData) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="max-w-lg"
          >
            <div className="text-8xl mb-6">🌤️</div>
            <h1 className="text-4xl font-extrabold mb-4 text-gradient">
              Welcome to WeatherPulse
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg leading-relaxed">
              Search for a city or enable geolocation to see personalized weather data, health insights, and more.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <MapPin size={16} />
              <span>Use the search bar above to get started</span>
            </div>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const { current, daily } = weatherData;
  const todayDaily = daily?.[0];

  const isExtremeTemp = current?.temp > 40 || current?.temp < -10;
  const isHighWind = current?.wind_speed > 60;
  const isHighUV = current?.uv > 10;
  const isPoorAQI = (airQualityData?.aqi ?? 0) > 150;
  const hasAlerts = isExtremeTemp || isHighWind || isHighUV || isPoorAQI;

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Weather in ${location.name}`,
          text: `Current temperature is ${Math.round(current.temp)}°C. ${generateSummary(weatherData, airQualityData)}`,
          url: window.location.href,
        });
      } else {
        toast.error("Sharing not supported on this browser.");
      }
    } catch (error) {
      console.log('Error sharing', error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateSummary(weatherData, airQualityData));
    setCopied(true);
    toast.success("Summary copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    try {
      toast.success("Preparing PDF Download...");
      const element = document.getElementById('dashboard-content');
      const opt = {
        margin: 1,
        filename: `weather-report-${location.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const html2pdf = (await import('html2pdf.js')).default;
      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Export error:", err);
      toast.error("Failed to export PDF");
    }
  };

  const widgetsMap = {
    temp: <TemperatureWidget key="temp" current={current.temp} feelsLike={weatherData.current.temp - (weatherData.current.temp - (weatherData.hourly?.[new Date().getHours()]?.temp ?? current.temp))} high={todayDaily?.temp_max ?? current.temp} low={todayDaily?.temp_min ?? current.temp} condition={current.condition} />,
    humidity: <HumidityWidget key="humidity" value={current.humidity} />,
    wind: <WindWidget key="wind" speed={current.wind_speed} direction={current.wind_dir} />,
    pressure: <PressureWidget key="pressure" value={current.pressure} />,
    uv: <UVWidget key="uv" value={current.uv} />,
    visibility: <VisibilityWidget key="visibility" value={current.visibility} />,
    rain: <RainWidget key="rain" value={current.precip_prob} />,
    aqi: (
      <GlassCard key="aqi" className="flex flex-col items-center justify-center min-h-[160px] h-full">
        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Air Quality</h4>
        <div className={`text-4xl font-bold ${
          (airQualityData?.aqi ?? 0) <= 50 ? 'text-emerald-500' :
          (airQualityData?.aqi ?? 0) <= 100 ? 'text-yellow-500' :
          (airQualityData?.aqi ?? 0) <= 150 ? 'text-orange-500' : 'text-red-500'
        }`}>
          {airQualityData?.aqi ?? '--'}
        </div>
        <p className="text-sm mt-2 text-slate-600 dark:text-slate-300 font-medium">
          {airQualityData?.level || 'N/A'}
        </p>
      </GlassCard>
    ),
    sun: <SunWidget key="sun" sunrise={current.sunrise} sunset={current.sunset} />,
    moon: <MoonWidget key="moon" date={new Date()} />
  };

  return (
    <PageWrapper>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
        id="dashboard-content"
      >
        {/* Smart Summary */}
        <motion.div variants={itemVariants}>
          <GlassCard className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl" />
            <div className="relative flex items-start gap-4 p-5">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl text-blue-500 dark:text-blue-400 shrink-0">
                <Sparkles size={24} />
              </div>
              <div className="flex-1 pr-10">
                <h3 className="text-lg font-semibold mb-1 text-slate-800 dark:text-slate-100">AI Smart Summary</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {generateSummary(weatherData, airQualityData)}
                </p>
              </div>
              <button 
                onClick={handleCopy}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors backdrop-blur text-slate-600 dark:text-slate-300"
                title="Copy Summary"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Weather Alerts */}
        {hasAlerts && (
          <motion.div variants={itemVariants} className="flex flex-col gap-3">
            {isExtremeTemp && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-medium">Extreme temperature warning in effect.</span>
              </div>
            )}
            {isPoorAQI && (
              <div className="bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 p-4 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-medium">Poor air quality. Sensitive groups should reduce outdoor exercise.</span>
              </div>
            )}
            {isHighUV && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 p-4 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-medium">Extreme UV levels. Avoid direct sun exposure.</span>
              </div>
            )}
            {isHighWind && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 p-4 rounded-xl flex items-center gap-3">
                <AlertTriangle size={20} />
                <span className="font-medium">High wind warning. Secure loose outdoor objects.</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Hero Section */}
        <motion.div variants={itemVariants}>
          <GlassCard className="p-8 relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={handleShare}
                className="p-2.5 rounded-full bg-white/20 dark:bg-gray-800/40 hover:bg-white/40 dark:hover:bg-gray-700/60 transition-colors text-slate-700 dark:text-slate-200 shadow-sm"
                title="Share Weather"
              >
                <Share2 size={20} />
              </button>
              <button 
                onClick={handleExportPDF}
                className="p-2.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20"
                title="Export as PDF"
              >
                <Download size={20} />
              </button>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mt-4 md:mt-0">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold mb-1 text-slate-800 dark:text-white">
                  {location.name}{location.country ? `, ${location.country}` : ''}
                </h2>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 justify-center md:justify-start">
                  <Clock size={14} />
                  <span>{formatDate(new Date())} • {formatTime(new Date())}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <WeatherIcon code={current.weather_code} size={80} isDay={current.is_day} className="drop-shadow-lg" />
                <div className="text-center">
                  <div className="text-7xl font-black text-slate-800 dark:text-white tracking-tighter">
                    {Math.round(current.temp)}°
                  </div>
                  <div className="text-lg text-slate-600 dark:text-slate-300 capitalize font-medium mt-1">
                    {current.condition}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Draggable Widget Grid */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.isArray(widgetOrder) && widgetOrder.map((id) => (
                widgetsMap[id] ? (
                  <SortableItem key={id} id={id}>
                    {widgetsMap[id]}
                  </SortableItem>
                ) : null
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>

        {/* Last Updated */}
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 pb-4 pt-4">
          <Clock size={12} className="inline mr-1" />
          Last Updated: {formatTime(current.last_updated || new Date())}
        </div>
      </motion.div>
    </PageWrapper>
  );
}
