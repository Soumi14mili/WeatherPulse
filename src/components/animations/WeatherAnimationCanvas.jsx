import React, { useEffect, useRef } from 'react';
import { WeatherAnimationEngine, getAnimationTypeByCode } from '../../utils/animationEngine';
import './weatherAnimations.css';

export default function WeatherAnimationCanvas({ weatherCode, isDay = true }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const animationType = getAnimationTypeByCode(weatherCode);

    // Initialize or re-create engine when weather type or day/night state changes
    if (engineRef.current) {
      engineRef.current.stop();
    }

    const engine = new WeatherAnimationEngine(canvas, animationType, isDay);
    engineRef.current = engine;
    engine.start();

    // Resize listener
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
        engineRef.current.initParticles();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, [weatherCode, isDay]);

  return (
    <div className="weather-animation-container weather-fade-in">
      <canvas ref={canvasRef} className="weather-animation-canvas" />
    </div>
  );
}
