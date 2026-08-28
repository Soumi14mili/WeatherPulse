import React from 'react';
import { useWeatherContext } from '../context/WeatherContext';
import PageWrapper from '../components/layout/PageWrapper';
import Skeleton from '../components/common/Skeleton';
import SearchBar from '../components/common/SearchBar';
import WeatherMap from '../components/map/WeatherMap';

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
        {/* Floating search bar overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[40] w-[90%] max-w-md">
          <SearchBar />
        </div>

        {/* Main Google Maps Component */}
        <WeatherMap />
      </div>
    </PageWrapper>
  );
}
