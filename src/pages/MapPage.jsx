import React from 'react';
import { useWeatherContext } from '../context/WeatherContext';
import PageWrapper from '../components/layout/PageWrapper';
import Skeleton from '../components/common/Skeleton';
import SearchBar from '../components/common/SearchBar';
import WeatherMap from '../components/map/WeatherMap';
import { Map } from 'lucide-react';

export default function MapPage() {
  const { weatherData, loading } = useWeatherContext();

  if (loading && !weatherData) {
    return (
      <PageWrapper>
        <Skeleton className="w-full h-[calc(100vh-120px)] rounded-2xl animate-pulse" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="relative w-full h-[calc(100vh-120px)] rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/40">

        {/* Floating header bar with search */}
        <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-4 flex items-center gap-3">
          {/* Title badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700 shrink-0">
            <Map size={16} className="text-indigo-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Weather Map</span>
          </div>
          {/* Search bar */}
          <div className="flex-1 max-w-md mx-auto">
            <SearchBar />
          </div>
        </div>

        {/* Map fills the full container */}
        <WeatherMap />
      </div>
    </PageWrapper>
  );
}
