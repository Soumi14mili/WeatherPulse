import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import ForecastPage from './pages/ForecastPage';
import AirQualityPage from './pages/AirQualityPage';
import HealthAdvisorPage from './pages/HealthAdvisorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import MapPage from './pages/MapPage';
import { useTheme } from './context/ThemeContext';
import { useWeatherContext } from './context/WeatherContext';
import WeatherAnimationCanvas from './components/animations/WeatherAnimationCanvas';

function App() {
  const location = useLocation();
  const { isDark } = useTheme();
  const { weatherData } = useWeatherContext();

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-main-gradient relative overflow-hidden">
        {weatherData && (
          <WeatherAnimationCanvas 
            weatherCode={weatherData.current.weather_code} 
            isDay={weatherData.current.is_day === 1} 
          />
        )}
        <Navbar />
        <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/air-quality" element={<AirQualityPage />} />
              <Route path="/health" element={<HealthAdvisorPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/map" element={<MapPage />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
