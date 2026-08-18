import React from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 dark:text-gray-400 capitalize">{entry.name.replace('_', ' ')}:</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const WeatherChart = ({ data, type = 'line', dataKeys = [], xKey = 'time' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  }

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {dataKeys.map((dk, i) => (
                <linearGradient key={`colorUv${i}`} id={`colorUv${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={dk.color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={dk.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xKey} stroke={textColor} fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip content={<CustomTooltip />} />
            {dataKeys.map((dk, i) => (
              <Area 
                key={dk.key} 
                type="monotone" 
                dataKey={dk.key} 
                stroke={dk.color} 
                fillOpacity={1} 
                fill={`url(#colorUv${i})`} 
                strokeWidth={3}
                name={dk.key}
              />
            ))}
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xKey} stroke={textColor} fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#374151' : '#f3f4f6' }} />
            {dataKeys.map(dk => (
              <Bar 
                key={dk.key} 
                dataKey={dk.key} 
                fill={dk.color} 
                radius={[4, 4, 0, 0]} 
                name={dk.key}
              />
            ))}
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xKey} stroke={textColor} fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke={textColor} fontSize={12} tickLine={false} axisLine={false} dx={-10} />
            <Tooltip content={<CustomTooltip />} />
            {dataKeys.map(dk => (
              <Line 
                key={dk.key} 
                type="monotone" 
                dataKey={dk.key} 
                stroke={dk.color} 
                strokeWidth={3} 
                dot={false}
                activeDot={{ r: 6, fill: dk.color, stroke: '#fff', strokeWidth: 2 }}
                name={dk.key}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
};

export default WeatherChart;
