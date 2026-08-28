// WeatherPulse Canvas Particle Animation Engine
// Highly optimized, responsive, and aesthetically premium.

export const AnimationTypes = {
  CLEAR: 'clear',
  CLOUDS: 'clouds',
  RAIN: 'rain',
  SNOW: 'snow',
  THUNDERSTORM: 'thunderstorm',
  FOG: 'fog',
  WIND: 'wind'
};

// Maps WMO codes from Open-Meteo to animation types
export function getAnimationTypeByCode(code) {
  if (code === undefined || code === null) return AnimationTypes.CLEAR;
  
  // Clear/Mainly Clear
  if (code === 0 || code === 1) return AnimationTypes.CLEAR;
  
  // Clouds
  if (code === 2 || code === 3) return AnimationTypes.CLOUDS;
  
  // Fog / Mist
  if (code === 45 || code === 48) return AnimationTypes.FOG;
  
  // Drizzle / Rain
  if (
    code === 51 || code === 53 || code === 55 ||
    code === 56 || code === 57 ||
    code === 61 || code === 63 || code === 65 ||
    code === 80 || code === 81
  ) return AnimationTypes.RAIN;
  
  // Snow / Freezing rain
  if (
    code === 66 || code === 67 ||
    code === 71 || code === 73 || code === 75 || code === 77 ||
    code === 85 || code === 86
  ) return AnimationTypes.SNOW;
  
  // Thunderstorm / Violent Rain
  if (code === 82 || code === 95 || code === 96 || code === 99) return AnimationTypes.THUNDERSTORM;
  
  // Default fallback
  return AnimationTypes.CLEAR;
}

export class WeatherAnimationEngine {
  constructor(canvas, type, isDay = true) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = type;
    this.isDay = isDay;
    this.particles = [];
    this.animationFrameId = null;
    this.width = 0;
    this.height = 0;
    this.lightningFlash = 0; // For thunderstorm flashes
    this.lastTime = 0;
    
    this.resize();
    this.initParticles();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  initParticles() {
    this.particles = [];
    const density = Math.min(this.width * this.height / 10000, 150); // Scale with screen size
    
    switch (this.type) {
      case AnimationTypes.RAIN:
      case AnimationTypes.THUNDERSTORM:
        for (let i = 0; i < density; i++) {
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height - this.height,
            vy: 8 + Math.random() * 8,
            vx: -1 - Math.random() * 2,
            len: 10 + Math.random() * 15,
            opacity: 0.15 + Math.random() * 0.35,
            width: 1 + Math.random() * 1.5
          });
        }
        break;

      case AnimationTypes.SNOW:
        const snowDensity = Math.min(this.width * this.height / 15000, 80);
        for (let i = 0; i < snowDensity; i++) {
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            r: 1.5 + Math.random() * 3,
            d: Math.random() * 50, // density parameter for sway
            vy: 0.8 + Math.random() * 1.2,
            vx: -0.5 + Math.random() * 1,
            opacity: 0.2 + Math.random() * 0.6
          });
        }
        break;

      case AnimationTypes.CLOUDS:
        const cloudCount = 6;
        for (let i = 0; i < cloudCount; i++) {
          this.particles.push({
            x: Math.random() * this.width * 1.5 - this.width * 0.25,
            y: Math.random() * this.height * 0.4 + 20,
            r: 80 + Math.random() * 100, // cloud circle radius
            vx: 0.1 + Math.random() * 0.15,
            opacity: 0.05 + Math.random() * 0.08
          });
        }
        break;

      case AnimationTypes.FOG:
        const fogCount = 5;
        for (let i = 0; i < fogCount; i++) {
          this.particles.push({
            x: Math.random() * this.width,
            y: this.height * 0.5 + Math.random() * this.height * 0.4,
            width: this.width * 0.8 + Math.random() * this.width * 0.4,
            height: 60 + Math.random() * 80,
            vx: -0.2 - Math.random() * 0.3,
            opacity: 0.06 + Math.random() * 0.08
          });
        }
        break;

      case AnimationTypes.WIND:
        const windCount = 30;
        for (let i = 0; i < windCount; i++) {
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            len: 80 + Math.random() * 120,
            vx: 4 + Math.random() * 6,
            vy: -0.2 + Math.random() * 0.4,
            opacity: 0.05 + Math.random() * 0.12,
            width: 1 + Math.random() * 2
          });
        }
        break;

      case AnimationTypes.CLEAR:
        // Sun rays/glare overlay & floating light specs
        const specCount = 25;
        for (let i = 0; i < specCount; i++) {
          this.particles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            r: 1 + Math.random() * 3,
            vx: -0.1 + Math.random() * 0.2,
            vy: -0.2 - Math.random() * 0.3,
            opacity: 0.1 + Math.random() * 0.3,
            maxOpacity: 0.1 + Math.random() * 0.3,
            speed: 0.02 + Math.random() * 0.02
          });
        }
        this.sunAngle = 0;
        break;
    }
  }

  updateAndDraw(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const elapsed = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Apply specific animations
    switch (this.type) {
      case AnimationTypes.RAIN:
        this.drawRain();
        break;
      case AnimationTypes.THUNDERSTORM:
        this.drawThunderstorm(elapsed);
        break;
      case AnimationTypes.SNOW:
        this.drawSnow();
        break;
      case AnimationTypes.CLOUDS:
        this.drawClouds();
        break;
      case AnimationTypes.FOG:
        this.drawFog();
        break;
      case AnimationTypes.WIND:
        this.drawWind();
        break;
      case AnimationTypes.CLEAR:
        this.drawClear();
        break;
    }

    this.animationFrameId = requestAnimationFrame((t) => this.updateAndDraw(t));
  }

  start() {
    this.lastTime = 0;
    this.animationFrameId = requestAnimationFrame((t) => this.updateAndDraw(t));
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  drawRain() {
    const isDark = !this.isDay;
    this.ctx.strokeStyle = isDark ? 'rgba(156, 163, 175, 0.4)' : 'rgba(59, 130, 246, 0.35)';
    this.ctx.lineCap = 'round';

    this.particles.forEach(p => {
      this.ctx.lineWidth = p.width;
      this.ctx.globalAlpha = p.opacity;
      
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x + p.vx, p.y + p.len);
      this.ctx.stroke();

      // Update positions
      p.x += p.vx;
      p.y += p.vy;

      // Reset when off bottom
      if (p.y > this.height) {
        p.y = -p.len - Math.random() * 20;
        p.x = Math.random() * this.width;
      }
    });
    this.ctx.globalAlpha = 1.0;
  }

  drawThunderstorm(elapsed) {
    // Draw base rain
    this.drawRain();

    // Trigger flash randomly
    if (this.lightningFlash > 0) {
      this.lightningFlash -= elapsed;
      if (this.lightningFlash < 0) this.lightningFlash = 0;
    } else if (Math.random() < 0.003) {
      // 0.3% chance per frame to trigger double or single lightning flash
      this.lightningFlash = 150 + Math.random() * 200;
    }

    if (this.lightningFlash > 0) {
      // Draw lightning flashes overlay
      const opacity = (this.lightningFlash / 350) * 0.45;
      this.ctx.fillStyle = `rgba(224, 231, 255, ${opacity})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      // Draw a subtle lightning branch sometimes
      if (this.lightningFlash > 200 && Math.random() < 0.2) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        let currX = Math.random() * this.width;
        let currY = 0;
        this.ctx.moveTo(currX, currY);
        while (currY < this.height * 0.6) {
          currX += (Math.random() - 0.5) * 50;
          currY += Math.random() * 40;
          this.ctx.lineTo(currX, currY);
        }
        this.ctx.stroke();
      }
    }
  }

  drawSnow() {
    this.ctx.fillStyle = this.isDay ? 'rgba(100, 116, 139, 0.6)' : 'rgba(255, 255, 255, 0.7)';
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.opacity;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();

      // Update positions
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.d) * 0.2;
      p.d += 0.01;

      // Reset when off bottom
      if (p.y > this.height) {
        p.y = -10;
        p.x = Math.random() * this.width;
      }
    });
    this.ctx.globalAlpha = 1.0;
  }

  drawClouds() {
    this.ctx.fillStyle = this.isDay ? 'rgba(255, 255, 255, 0.3)' : 'rgba(148, 163, 184, 0.15)';
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.opacity;
      
      // Render simple abstract cloud shapes using multiple overlapping arcs
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.arc(p.x + p.r * 0.6, p.y - p.r * 0.2, p.r * 0.8, 0, Math.PI * 2);
      this.ctx.arc(p.x - p.r * 0.6, p.y - p.r * 0.1, p.r * 0.7, 0, Math.PI * 2);
      this.ctx.fill();

      // Update
      p.x += p.vx;

      // Loop around
      if (p.x - p.r * 1.5 > this.width) {
        p.x = -p.r * 1.5;
        p.y = Math.random() * this.height * 0.4 + 20;
      }
    });
    this.ctx.globalAlpha = 1.0;
  }

  drawFog() {
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.opacity;
      
      const grad = this.ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y);
      if (this.isDay) {
        grad.addColorStop(0, 'rgba(203, 213, 225, 0)');
        grad.addColorStop(0.5, 'rgba(203, 213, 225, 0.5)');
        grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
      } else {
        grad.addColorStop(0, 'rgba(71, 85, 105, 0)');
        grad.addColorStop(0.5, 'rgba(71, 85, 105, 0.35)');
        grad.addColorStop(1, 'rgba(71, 85, 105, 0)');
      }

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(p.x, p.y, p.width, p.height);

      // Move fog slowly
      p.x += p.vx;

      // Loop fog layers
      if (p.x + p.width < 0) {
        p.x = this.width + 10;
        p.y = this.height * 0.5 + Math.random() * this.height * 0.4;
      }
    });
    this.ctx.globalAlpha = 1.0;
  }

  drawWind() {
    this.ctx.strokeStyle = this.isDay ? 'rgba(100, 116, 139, 0.15)' : 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineCap = 'round';
    
    this.particles.forEach(p => {
      this.ctx.lineWidth = p.width;
      this.ctx.globalAlpha = p.opacity;
      
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x + p.len, p.y + p.vy * 5);
      this.ctx.stroke();

      p.x += p.vx;
      p.y += p.vy;

      if (p.x > this.width) {
        p.x = -p.len;
        p.y = Math.random() * this.height;
      }
    });
    this.ctx.globalAlpha = 1.0;
  }

  drawClear() {
    // Draw sun glare and warm background rays if day mode
    if (this.isDay) {
      const centerX = this.width * 0.85;
      const centerY = 80;
      
      this.sunAngle += 0.001;
      
      // Draw subtle rays
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(this.sunAngle);
      
      this.ctx.fillStyle = 'rgba(251, 146, 60, 0.02)';
      const rayCount = 8;
      for (let i = 0; i < rayCount; i++) {
        this.ctx.rotate((Math.PI * 2) / rayCount);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-30, 400);
        this.ctx.lineTo(30, 400);
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.restore();

      // Soft sun core glow
      const sunGlow = this.ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 150);
      sunGlow.addColorStop(0, 'rgba(253, 224, 71, 0.12)');
      sunGlow.addColorStop(0.5, 'rgba(251, 146, 60, 0.04)');
      sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = sunGlow;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, 150, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw floating dust particles/stars
    this.ctx.fillStyle = this.isDay ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.7)';
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.opacity;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fill();

      // Slow drift
      p.x += p.vx;
      p.y += p.vy;

      // Pulse opacity
      p.opacity += p.speed;
      if (p.opacity > p.maxOpacity || p.opacity < 0.05) {
        p.speed = -p.speed;
      }

      // Keep inside bounds
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    });
    this.ctx.globalAlpha = 1.0;
  }
}
