import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import PageWrapper from '../components/layout/PageWrapper';
import GlassCard from '../components/common/GlassCard';
import Skeleton from '../components/common/Skeleton';
import AQIGauge from '../components/dashboard/AQIGauge';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime } from '../utils/formatters';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AirQualityPage() {
  const { airQualityData, loading } = useWeatherContext();

  if (loading || !airQualityData) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  const { aqi, level, description, pollutants, history } = airQualityData;

  const getPollutantColor = (value, max) => {
    const ratio = value / max;
    if (ratio < 0.3) return 'bg-green-500';
    if (ratio < 0.6) return 'bg-yellow-500';
    if (ratio < 0.8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <PageWrapper>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <h1 className="text-3xl font-bold">Air Quality Index</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Gauge */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <GlassCard className="flex flex-col items-center justify-center p-8 h-full">
              <AQIGauge value={aqi} size={200} />
              <div className="mt-6 text-center">
                <h3 className="text-2xl font-bold">{level}</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{description}</p>
              </div>
            </GlassCard>
          </motion.div>

          {/* Recommendations */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <GlassCard className="p-6 h-full flex flex-col justify-center">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="text-blue-500" />
                Health Recommendations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl">
                  <h4 className="font-medium mb-1">Sensitive Groups</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {aqi > 100 ? 'Should reduce prolonged or heavy exertion outdoors.' : 'No special precautions needed.'}
                  </p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl">
                  <h4 className="font-medium mb-1">General Public</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {aqi > 150 ? 'Should reduce prolonged outdoor exertion.' : 'Enjoy your outdoor activities.'}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Pollutants */}
        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-semibold mb-4">Pollutants Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(pollutants || {}).map(([key, data]) => (
              <GlassCard key={key} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold uppercase">{key}</span>
                  <span className="text-sm text-slate-500">{data.value} {data.unit}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getPollutantColor(data.value, data.max)}`} 
                    style={{ width: `${Math.min(100, (data.value / data.max) * 100)}%` }}
                  ></div>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>

        {/* Trend */}
        {history && history.length > 0 && (
          <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-4">24-Hour Trend</h2>
            <GlassCard className="h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tickFormatter={(t) => formatTime(t)} stroke="#94a3b8" fontSize={12} />
                  <Tooltip labelFormatter={(t) => formatTime(t)} />
                  <Area type="monotone" dataKey="aqi" stroke="#10b981" fillOpacity={1} fill="url(#colorAqi)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        )}

      </motion.div>
    </PageWrapper>
  );
}
