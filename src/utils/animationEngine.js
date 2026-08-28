// WeatherPulse Canvas Particle Animation Engine v2.0
// Highly optimized, responsive, and visually premium with dramatic effects.

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
  if (code === 0 || code === 1) return AnimationTypes.CLEAR;
  if (code === 2 || code === 3) return AnimationTypes.CLOUDS;
  if (code === 45 || code === 48) return AnimationTypes.FOG;
  if (
    code === 51 || code === 53 || code === 55 ||
    code === 56 || code === 57 ||
    code === 61 || code === 63 || code === 65 ||
    code === 80 || code === 81
  ) return AnimationTypes.RAIN;
  if (
    code === 66 || code === 67 ||
    code === 71 || code === 73 || code === 75 || code === 77 ||
    code === 85 || code === 86
  ) return AnimationTypes.SNOW;
  if (code === 82 || code === 95 || code === 96 || code === 99) return AnimationTypes.THUNDERSTORM;
  return AnimationTypes.CLEAR;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

// Draw a 6-pointed snowflake at (cx, cy) with given radius
function drawSnowflake(ctx, cx, cy, radius, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, radius);
    // Small side branches
    ctx.moveTo(0, radius * 0.35);
    ctx.lineTo(radius * 0.2, radius * 0.55);
    ctx.moveTo(0, radius * 0.35);
    ctx.lineTo(-radius * 0.2, radius * 0.55);
    ctx.moveTo(0, radius * 0.65);
    ctx.lineTo(radius * 0.15, radius * 0.8);
    ctx.moveTo(0, radius * 0.65);
    ctx.lineTo(-radius * 0.15, radius * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

// Draw a jagged lightning bolt from (x1,y1) down to length
function drawLightningBolt(ctx, startX, startY, length) {
  const segments = 8 + Math.floor(Math.random() * 4);
  const segLen = length / segments;
  let x = startX;
  let y = startY;

  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < segments; i++) {
    const jag = (Math.random() - 0.5) * 70;
    x += jag;
    y += segLen;
    ctx.lineTo(x, y);
    // Occasional branch
    if (i > 1 && Math.random() < 0.3) {
      const branchLen = segLen * (1 + Math.random());
      ctx.lineTo(x + (Math.random() - 0.5) * 60, y + branchLen);
      ctx.moveTo(x, y);
    }
  }
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Engine
// ─────────────────────────────────────────────────────────────────────────────

export class WeatherAnimationEngine {
  constructor(canvas, type, isDay = true) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = type;
    this.isDay = isDay;
    this.particles = [];
    this.splashes = [];          // Rain splash rings
    this.stars = [];             // Night stars
    this.shootingStar = null;    // Shooting star object
    this.animationFrameId = null;
    this.width = 0;
    this.height = 0;
    this.lightningState = { active: false, opacity: 0, cooldown: 0, boltX: 0 };
    this.lastTime = 0;
    this.sunAngle = 0;
    this.sunPulse = 0;          // For pulsing halo

    this.resize();
    this.initParticles();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  initParticles() {
    this.particles = [];
    this.splashes = [];
    this.stars = [];
    this.shootingStar = null;

    switch (this.type) {
      // ── Rain ────────────────────────────────────────────────────
      case AnimationTypes.RAIN:
      case AnimationTypes.THUNDERSTORM: {
        const density = Math.min(this.width * this.height / 6000, 200);
        for (let i = 0; i < density; i++) {
          this.particles.push({
            x: randomBetween(-this.width * 0.1, this.width * 1.1),
            y: randomBetween(-this.height, 0),
            vy: randomBetween(10, 20),
            vx: randomBetween(-3, -1),
            len: randomBetween(12, 28),
            opacity: randomBetween(0.2, 0.55),
            width: randomBetween(0.8, 2),
            layer: Math.random() < 0.3 ? 'front' : 'back', // depth layers
          });
        }
        break;
      }

      // ── Snow ─────────────────────────────────────────────────────
      case AnimationTypes.SNOW: {
        const snowDensity = Math.min(this.width * this.height / 18000, 80);
        for (let i = 0; i < snowDensity; i++) {
          this.particles.push({
            x: randomBetween(0, this.width),
            y: randomBetween(-50, this.height),
            r: randomBetween(4, 11),
            sway: randomBetween(0, Math.PI * 2),
            swaySpeed: randomBetween(0.005, 0.015),
            swayAmp: randomBetween(0.3, 1.2),
            vy: randomBetween(0.5, 1.8),
            opacity: randomBetween(0.4, 0.9),
            rotation: randomBetween(0, Math.PI * 2),
            rotSpeed: randomBetween(-0.01, 0.01),
          });
        }
        break;
      }

      // ── Clouds ───────────────────────────────────────────────────
      case AnimationTypes.CLOUDS: {
        const cloudCount = 8;
        for (let i = 0; i < cloudCount; i++) {
          this.particles.push({
            x: randomBetween(-200, this.width + 200),
            y: randomBetween(20, this.height * 0.5),
            r: randomBetween(60, 140),
            vx: randomBetween(0.05, 0.25),
            opacity: randomBetween(0.12, 0.28),
            layer: i < 3 ? 'back' : 'front',
          });
        }
        break;
      }

      // ── Fog ──────────────────────────────────────────────────────
      case AnimationTypes.FOG: {
        const fogCount = 7;
        for (let i = 0; i < fogCount; i++) {
          this.particles.push({
            x: randomBetween(-this.width * 0.5, this.width),
            y: randomBetween(this.height * 0.2, this.height * 0.95),
            width: randomBetween(this.width * 0.8, this.width * 1.5),
            height: randomBetween(50, 110),
            vx: randomBetween(-0.35, -0.1),
            opacity: randomBetween(0.04, 0.12),
          });
        }
        break;
      }

      // ── Wind ─────────────────────────────────────────────────────
      case AnimationTypes.WIND: {
        const windCount = 35;
        for (let i = 0; i < windCount; i++) {
          this.particles.push({
            x: randomBetween(-200, this.width),
            y: randomBetween(0, this.height),
            len: randomBetween(80, 200),
            cx1Offset: randomBetween(-60, 60),
            cy1Offset: randomBetween(-20, 20),
            vx: randomBetween(3, 9),
            opacity: randomBetween(0.04, 0.14),
            width: randomBetween(1, 3),
          });
        }
        break;
      }

      // ── Clear ─────────────────────────────────────────────────────
      case AnimationTypes.CLEAR: {
        if (this.isDay) {
          // Warm shimmer dust particles
          const specCount = 30;
          for (let i = 0; i < specCount; i++) {
            const opacity = randomBetween(0.05, 0.35);
            this.particles.push({
              x: randomBetween(0, this.width),
              y: randomBetween(0, this.height),
              r: randomBetween(1, 3.5),
              vx: randomBetween(-0.2, 0.2),
              vy: randomBetween(-0.4, -0.1),
              opacity,
              maxOpacity: opacity,
              speed: randomBetween(0.005, 0.02),
              dir: 1,
            });
          }
        } else {
          // Twinkling stars
          const starCount = 90;
          for (let i = 0; i < starCount; i++) {
            this.stars.push({
              x: randomBetween(0, this.width),
              y: randomBetween(0, this.height * 0.85),
              r: randomBetween(0.5, 2.5),
              opacity: randomBetween(0.2, 0.9),
              speed: randomBetween(0.005, 0.025),
              dir: Math.random() < 0.5 ? 1 : -1,
              maxOpacity: randomBetween(0.5, 1.0),
              minOpacity: randomBetween(0.05, 0.2),
            });
          }
          // Occasional shooting star
          this.shootingStar = null;
          this.nextShootingStarIn = randomBetween(200, 600); // frames
        }
        this.sunAngle = 0;
        this.sunPulse = 0;
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render loop
  // ─────────────────────────────────────────────────────────────────────────

  updateAndDraw(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const elapsed = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.ctx.clearRect(0, 0, this.width, this.height);

    switch (this.type) {
      case AnimationTypes.RAIN:        this.drawRain(false); break;
      case AnimationTypes.THUNDERSTORM: this.drawThunderstorm(elapsed); break;
      case AnimationTypes.SNOW:        this.drawSnow(); break;
      case AnimationTypes.CLOUDS:      this.drawClouds(); break;
      case AnimationTypes.FOG:         this.drawFog(); break;
      case AnimationTypes.WIND:        this.drawWind(); break;
      case AnimationTypes.CLEAR:       this.drawClear(); break;
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
      this.animationFrameId = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RAIN
  // ─────────────────────────────────────────────────────────────────────────

  drawRain(isThunderstorm = false) {
    const ctx = this.ctx;
    const isDark = !this.isDay;

    // Back-layer (lighter, smaller — depth effect)
    ctx.lineCap = 'round';
    this.particles.forEach(p => {
      const isBack = p.layer === 'back';
      const alpha = isBack ? p.opacity * 0.5 : p.opacity;
      const w = isBack ? p.width * 0.6 : p.width;
      const len = isBack ? p.len * 0.6 : p.len;

      ctx.strokeStyle = isDark
        ? `rgba(180, 200, 230, ${alpha})`
        : `rgba(60, 120, 220, ${alpha})`;
      ctx.lineWidth = w;
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * (len / p.vy), p.y + len);
      ctx.stroke();

      p.x += p.vx;
      p.y += p.vy;

      if (p.y > this.height) {
        // Spawn a splash ring
        this.splashes.push({
          x: p.x,
          y: this.height - 2,
          r: 0,
          maxR: randomBetween(4, 10),
          opacity: 0.4,
        });
        p.y = randomBetween(-this.height * 0.5, -10);
        p.x = randomBetween(-this.width * 0.1, this.width * 1.1);
      }
      if (p.x < -20) p.x = this.width + 10;
    });

    // Draw and update splash rings
    this.splashes = this.splashes.filter(s => s.opacity > 0.01);
    this.splashes.forEach(s => {
      ctx.globalAlpha = s.opacity;
      ctx.strokeStyle = isDark
        ? `rgba(160, 200, 240, 0.8)`
        : `rgba(80, 140, 220, 0.8)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.r * 2, s.r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      s.r += 0.7;
      s.opacity *= 0.85;
    });

    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THUNDERSTORM
  // ─────────────────────────────────────────────────────────────────────────

  drawThunderstorm(elapsed) {
    this.drawRain(true);

    const ls = this.lightningState;
    const ctx = this.ctx;

    if (ls.active) {
      ls.opacity = Math.max(0, ls.opacity - elapsed * 0.003);
      if (ls.opacity <= 0) {
        ls.active = false;
        ls.cooldown = randomBetween(1500, 5000);
      }
    } else {
      ls.cooldown -= elapsed;
      if (ls.cooldown <= 0 && Math.random() < 0.04) {
        ls.active = true;
        ls.opacity = randomBetween(0.55, 0.9);
        ls.boltX = randomBetween(this.width * 0.15, this.width * 0.85);
        ls.boltStartY = randomBetween(0, this.height * 0.2);
        ls.boltLen = randomBetween(this.height * 0.4, this.height * 0.75);
      }
    }

    if (ls.active && ls.opacity > 0) {
      // Screen flash
      ctx.fillStyle = `rgba(210, 220, 255, ${ls.opacity * 0.35})`;
      ctx.fillRect(0, 0, this.width, this.height);

      // Glow behind bolt
      const glow = ctx.createRadialGradient(
        ls.boltX, ls.boltStartY + ls.boltLen * 0.4,
        0,
        ls.boltX, ls.boltStartY + ls.boltLen * 0.4,
        80
      );
      glow.addColorStop(0, `rgba(200, 220, 255, ${ls.opacity * 0.4})`);
      glow.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(ls.boltX - 100, ls.boltStartY, 200, ls.boltLen);

      // Main bolt
      ctx.save();
      ctx.shadowColor = 'rgba(180, 200, 255, 0.9)';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = `rgba(255, 255, 255, ${ls.opacity})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawLightningBolt(ctx, ls.boltX, ls.boltStartY, ls.boltLen);
      ctx.restore();

      // Inner bright core
      ctx.save();
      ctx.strokeStyle = `rgba(240, 248, 255, ${ls.opacity * 0.7})`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawLightningBolt(ctx, ls.boltX, ls.boltStartY, ls.boltLen);
      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SNOW
  // ─────────────────────────────────────────────────────────────────────────

  drawSnow() {
    const ctx = this.ctx;
    ctx.lineCap = 'round';

    this.particles.forEach(p => {
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = this.isDay
        ? 'rgba(180, 200, 220, 0.9)'
        : 'rgba(240, 248, 255, 0.95)';
      ctx.lineWidth = 1;

      drawSnowflake(ctx, p.x, p.y, p.r, p.rotation);

      // Update
      p.sway += p.swaySpeed;
      p.x += Math.sin(p.sway) * p.swayAmp;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      if (p.y > this.height + p.r * 2) {
        p.y = -p.r * 2 - 10;
        p.x = randomBetween(0, this.width);
      }
    });
    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLOUDS
  // ─────────────────────────────────────────────────────────────────────────

  drawClouds() {
    const ctx = this.ctx;
    const isDark = !this.isDay;

    // Draw back layer first (smaller, less opaque)
    const sorted = [...this.particles].sort((a, b) =>
      (a.layer === 'back' ? -1 : 1)
    );

    sorted.forEach(p => {
      const scale = p.layer === 'back' ? 0.6 : 1;
      const baseR = p.r * scale;

      ctx.globalAlpha = p.opacity * (p.layer === 'back' ? 0.6 : 1);

      if (isDark) {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      }

      // Cloud shape: multiple overlapping circles
      ctx.beginPath();
      ctx.arc(p.x, p.y, baseR, 0, Math.PI * 2);
      ctx.arc(p.x + baseR * 0.7, p.y - baseR * 0.25, baseR * 0.75, 0, Math.PI * 2);
      ctx.arc(p.x - baseR * 0.7, p.y - baseR * 0.15, baseR * 0.65, 0, Math.PI * 2);
      ctx.arc(p.x + baseR * 1.3, p.y + baseR * 0.1, baseR * 0.5, 0, Math.PI * 2);
      ctx.arc(p.x - baseR * 1.2, p.y + baseR * 0.05, baseR * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Subtle shadow under cloud (day only)
      if (!isDark) {
        ctx.globalAlpha = p.opacity * 0.15;
        ctx.fillStyle = 'rgba(100, 130, 160, 0.5)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + baseR * 0.9, baseR * 1.2, baseR * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      p.x += p.vx;
      if (p.x - p.r * 2 > this.width) {
        p.x = -p.r * 2;
        p.y = randomBetween(20, this.height * 0.5);
      }
    });
    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOG
  // ─────────────────────────────────────────────────────────────────────────

  drawFog() {
    const ctx = this.ctx;
    const isDark = !this.isDay;

    this.particles.forEach(p => {
      const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.width, p.y);
      if (isDark) {
        grad.addColorStop(0, 'rgba(71, 85, 105, 0)');
        grad.addColorStop(0.3, `rgba(71, 85, 105, ${p.opacity * 3})`);
        grad.addColorStop(0.7, `rgba(71, 85, 105, ${p.opacity * 3})`);
        grad.addColorStop(1, 'rgba(71, 85, 105, 0)');
      } else {
        grad.addColorStop(0, 'rgba(203, 213, 225, 0)');
        grad.addColorStop(0.3, `rgba(210, 220, 230, ${p.opacity * 4})`);
        grad.addColorStop(0.7, `rgba(210, 220, 230, ${p.opacity * 4})`);
        grad.addColorStop(1, 'rgba(203, 213, 225, 0)');
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, p.y, p.width, p.height);

      p.x += p.vx;
      if (p.x + p.width < 0) {
        p.x = this.width + 20;
        p.y = randomBetween(this.height * 0.2, this.height * 0.95);
      }
    });
    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WIND
  // ─────────────────────────────────────────────────────────────────────────

  drawWind() {
    const ctx = this.ctx;
    const isDark = !this.isDay;
    ctx.lineCap = 'round';

    this.particles.forEach(p => {
      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = isDark
        ? 'rgba(148, 163, 184, 0.6)'
        : 'rgba(100, 116, 139, 0.5)';
      ctx.lineWidth = p.width;

      // Bezier curve for organic wind streak
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.bezierCurveTo(
        p.x + p.len * 0.3, p.y + p.cy1Offset,
        p.x + p.len * 0.7, p.y + p.cx1Offset * 0.3,
        p.x + p.len, p.y + p.cy1Offset * 0.5
      );
      ctx.stroke();

      p.x += p.vx;
      if (p.x > this.width + p.len) {
        p.x = -p.len - 20;
        p.y = randomBetween(0, this.height);
      }
    });
    ctx.globalAlpha = 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLEAR – Day (sun) / Night (stars)
  // ─────────────────────────────────────────────────────────────────────────

  drawClear() {
    const ctx = this.ctx;

    if (this.isDay) {
      this.sunAngle += 0.0008;
      this.sunPulse += 0.02;

      const cx = this.width * 0.82;
      const cy = 90;
      const pulseScale = 1 + Math.sin(this.sunPulse) * 0.04;

      // Outer warm halo
      const outerGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 220 * pulseScale);
      outerGlow.addColorStop(0, 'rgba(255, 220, 100, 0.18)');
      outerGlow.addColorStop(0.4, 'rgba(255, 160, 50, 0.07)');
      outerGlow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 220 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Sun rotating rays
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.sunAngle);
      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        ctx.rotate((Math.PI * 2) / rayCount);
        ctx.fillStyle = 'rgba(253, 210, 60, 0.025)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-15, 350);
        ctx.lineTo(15, 350);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Sun core disk
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55);
      coreGrad.addColorStop(0, 'rgba(255, 240, 120, 0.22)');
      coreGrad.addColorStop(0.6, 'rgba(255, 200, 60, 0.1)');
      coreGrad.addColorStop(1, 'rgba(255,180,40,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 55, 0, Math.PI * 2);
      ctx.fill();

      // Gold shimmer particles
      this.particles.forEach(p => {
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = 'rgba(253, 210, 80, 0.7)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.speed * p.dir;
        if (p.opacity > p.maxOpacity || p.opacity < 0.03) p.dir = -p.dir;
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
      });

    } else {
      // Night sky — twinkling stars
      this.stars.forEach(s => {
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        // Twinkle
        s.opacity += s.speed * s.dir;
        if (s.opacity > s.maxOpacity || s.opacity < s.minOpacity) s.dir = -s.dir;
      });

      // Shooting star logic
      if (this.shootingStar) {
        const ss = this.shootingStar;
        ctx.globalAlpha = ss.opacity;
        ctx.strokeStyle = 'rgba(255, 255, 220, 1)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        // Gradient tail
        const grad = ctx.createLinearGradient(
          ss.x, ss.y,
          ss.x - ss.dx * ss.tailLen, ss.y - ss.dy * ss.tailLen
        );
        grad.addColorStop(0, `rgba(255,255,220,${ss.opacity})`);
        grad.addColorStop(1, 'rgba(255,255,220,0)');
        ctx.strokeStyle = grad;

        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.dx * ss.tailLen, ss.y - ss.dy * ss.tailLen);
        ctx.stroke();

        ss.x += ss.dx * 8;
        ss.y += ss.dy * 8;
        ss.opacity -= 0.012;

        if (ss.opacity <= 0 || ss.x > this.width + 50 || ss.y > this.height + 50) {
          this.shootingStar = null;
          this.nextShootingStarIn = randomBetween(300, 800);
        }
      } else {
        this.nextShootingStarIn--;
        if (this.nextShootingStarIn <= 0) {
          const angle = randomBetween(20, 50) * (Math.PI / 180);
          this.shootingStar = {
            x: randomBetween(0, this.width * 0.6),
            y: randomBetween(0, this.height * 0.4),
            dx: Math.cos(angle),
            dy: Math.sin(angle),
            tailLen: randomBetween(60, 120),
            opacity: randomBetween(0.7, 1.0),
          };
        }
      }
    }

    ctx.globalAlpha = 1;
  }
}
