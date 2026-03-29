import { useEffect, useRef, useState, useCallback } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const startRef = useRef(0);
  const [phase, setPhase] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const isReturning = localStorage.getItem('splashSeen') === '1';

  useEffect(() => {
    localStorage.setItem('splashSeen', '1');
    if (isReturning) {
      // Fast splash for returning users
      const t = [
        setTimeout(() => setPhase(1), 50),
        setTimeout(() => setPhase(2), 100),
        setTimeout(() => setPhase(3), 200),
        setTimeout(() => setPhase(4), 350),
        setTimeout(() => setPhase(5), 550),
        setTimeout(() => onFinishRef.current(), 800),
      ];
      return () => t.forEach(clearTimeout);
    }
    const t = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 2500),
      setTimeout(() => onFinishRef.current(), 3000),
    ];
    return () => t.forEach(clearTimeout);
  }, [isReturning]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;
    const now = performance.now();
    const t = (now - startRef.current) / 1000;
    ctx.clearRect(0, 0, w * dpr, h * dpr);

    const fadeOut = phase === 5 ? Math.max(0, 1 - (t - 2.5) / 0.5) : 1;

    // === DEEP BACKGROUND ===
    // Subtle warm vignette
    if (phase >= 1) {
      const vignetteA = Math.min((t - 0.1) / 0.5, 1) * fadeOut;
      const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      vig.addColorStop(0, `rgba(25,18,8,${0.4 * vignetteA})`);
      vig.addColorStop(0.5, `rgba(12,10,5,${0.2 * vignetteA})`);
      vig.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    }

    // === GOLDEN RING PULSE (expanding ring from center) ===
    if (phase >= 2) {
      const ringT = Math.min((t - 0.5) / 1.5, 1);
      const ringEase = 1 - Math.pow(1 - ringT, 2);
      const ringR = ringEase * 300;
      const ringAlpha = (1 - ringEase) * 0.15 * fadeOut;

      if (ringAlpha > 0.001) {
        ctx.save();
        ctx.strokeStyle = `rgba(229,160,13,${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(229,160,13,0.3)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Second ring (delayed)
      if (t > 0.8) {
        const r2T = Math.min((t - 0.8) / 1.5, 1);
        const r2Ease = 1 - Math.pow(1 - r2T, 2);
        const r2R = r2Ease * 250;
        const r2Alpha = (1 - r2Ease) * 0.1 * fadeOut;
        if (r2Alpha > 0.001) {
          ctx.strokeStyle = `rgba(229,160,13,${r2Alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r2R, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // === CENTRAL GLOW (warm golden aura behind logo) ===
    if (phase >= 2) {
      const glowT = Math.min((t - 0.5) / 0.8, 1);
      const glowEase = 1 - Math.pow(1 - glowT, 3);
      const breathe = 1 + Math.sin(t * 2) * 0.05;
      const glowR = 120 * glowEase * breathe;

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, `rgba(229,160,13,${0.2 * glowEase * fadeOut})`);
      glow.addColorStop(0.3, `rgba(200,130,10,${0.1 * glowEase * fadeOut})`);
      glow.addColorStop(0.6, `rgba(150,90,5,${0.04 * glowEase * fadeOut})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();
    }

    // === FLOATING PARTICLES (golden dust, rising slowly) ===
    if (phase >= 1) {
      const particleAlpha = Math.min((t - 0.1) / 1, 1) * fadeOut;
      ctx.save();
      ctx.globalAlpha = particleAlpha;

      for (let i = 0; i < 60; i++) {
        // Each particle has unique trajectory
        const seed = i * 7.31;
        const speed = 0.15 + (Math.sin(seed) * 0.5 + 0.5) * 0.25;
        const baseX = ((Math.sin(seed * 1.3) + 1) / 2) * w;
        const drift = Math.sin(t * 0.5 + seed * 2.1) * 30;

        // Particles rise upward and loop
        const yProgress = ((t * speed + Math.sin(seed) * 10) % (h + 40)) / (h + 40);
        const px = baseX + drift;
        const py = h + 20 - yProgress * (h + 40);

        // Distance from center = brightness boost
        const dx = px - cx, dy = py - cy;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        const nearCenter = Math.max(0, 1 - distFromCenter / (Math.max(w, h) * 0.4));

        const size = (0.5 + Math.sin(seed * 3.7) * 0.3 + nearCenter * 1.5);
        const alpha = (0.15 + nearCenter * 0.4) * (0.5 + Math.sin(t * 2 + seed) * 0.3);

        // Warm golden color
        const r = 220 + Math.sin(seed * 2.3) * 35;
        const g = 150 + Math.sin(seed * 1.7) * 40;
        const b = 10 + Math.sin(seed * 3.1) * 15;

        // Particle glow
        if (nearCenter > 0.3) {
          const pg = ctx.createRadialGradient(px, py, 0, px, py, size * 4);
          pg.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.3})`);
          pg.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = pg;
          ctx.beginPath(); ctx.arc(px, py, size * 4, 0, Math.PI * 2); ctx.fill();
        }

        // Particle core
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // === 7 DRAGON BALLS ORBITING (centered on logo) ===
    if (phase >= 2) {
      const dbAlpha = Math.min((t - 0.5) / 0.6, 1) * fadeOut;
      ctx.save();
      ctx.globalAlpha = dbAlpha;

      // Logo center is ~63px above screen center (text + bar pushes it up in flex)
      const logoCx = cx;
      const logoCy = cy - 63;

      // Helper: draw a 5-pointed star shape
      const drawStar = (sx: number, sy: number, r: number) => {
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = (p * 4 * Math.PI) / 5 - Math.PI / 2;
          const method = p === 0 ? 'moveTo' : 'lineTo';
          ctx[method](sx + Math.cos(a) * r, sy + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      };

      for (let i = 0; i < 7; i++) {
        const starCount = i + 1;
        const angle = t * 0.5 + i * (Math.PI * 2 / 7);
        const orbitR = 110 + Math.sin(t * 1.0 + i * 1.3) * 6;
        const bx = logoCx + Math.cos(angle) * orbitR;
        const by = logoCy + Math.sin(angle) * orbitR;
        const ballR = 22;

        // Soft outer glow (bright)
        const outerGlow = ctx.createRadialGradient(bx, by, ballR * 0.2, bx, by, ballR * 3);
        outerGlow.addColorStop(0, 'rgba(255,200,50,0.45)');
        outerGlow.addColorStop(0.3, 'rgba(255,150,20,0.2)');
        outerGlow.addColorStop(0.6, 'rgba(255,120,0,0.08)');
        outerGlow.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = outerGlow;
        ctx.beginPath(); ctx.arc(bx, by, ballR * 3, 0, Math.PI * 2); ctx.fill();

        // Ball shadow (bottom edge)
        const shadow = ctx.createRadialGradient(bx, by + ballR * 0.15, ballR * 0.6, bx, by, ballR * 1.05);
        shadow.addColorStop(0, 'rgba(120,50,0,0.6)');
        shadow.addColorStop(0.7, 'rgba(80,30,0,0.3)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.beginPath(); ctx.arc(bx, by, ballR * 1.05, 0, Math.PI * 2); ctx.fill();

        // Main ball body — deep orange sphere
        const ballGrad = ctx.createRadialGradient(bx - ballR * 0.35, by - ballR * 0.35, ballR * 0.05, bx + ballR * 0.1, by + ballR * 0.1, ballR);
        ballGrad.addColorStop(0, '#ffe566');
        ballGrad.addColorStop(0.2, '#ffcc33');
        ballGrad.addColorStop(0.5, '#ff9900');
        ballGrad.addColorStop(0.8, '#e07000');
        ballGrad.addColorStop(1, '#993800');
        ctx.fillStyle = ballGrad;
        ctx.beginPath(); ctx.arc(bx, by, ballR, 0, Math.PI * 2); ctx.fill();

        // Inner depth ring (subtle dark edge)
        ctx.strokeStyle = 'rgba(100,40,0,0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(bx, by, ballR - 0.5, 0, Math.PI * 2); ctx.stroke();

        // Primary specular highlight (top-left)
        const spec1 = ctx.createRadialGradient(bx - ballR * 0.3, by - ballR * 0.35, 0, bx - ballR * 0.3, by - ballR * 0.35, ballR * 0.55);
        spec1.addColorStop(0, 'rgba(255,255,255,0.85)');
        spec1.addColorStop(0.3, 'rgba(255,255,240,0.4)');
        spec1.addColorStop(0.6, 'rgba(255,240,200,0.1)');
        spec1.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = spec1;
        ctx.beginPath(); ctx.arc(bx, by, ballR, 0, Math.PI * 2); ctx.fill();

        // Secondary highlight (smaller, sharper)
        const spec2 = ctx.createRadialGradient(bx - ballR * 0.35, by - ballR * 0.4, 0, bx - ballR * 0.35, by - ballR * 0.4, ballR * 0.2);
        spec2.addColorStop(0, 'rgba(255,255,255,0.9)');
        spec2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = spec2;
        ctx.beginPath(); ctx.arc(bx, by, ballR, 0, Math.PI * 2); ctx.fill();

        // Rim light (bottom-right edge)
        const rim = ctx.createRadialGradient(bx + ballR * 0.4, by + ballR * 0.35, ballR * 0.3, bx + ballR * 0.4, by + ballR * 0.35, ballR * 0.8);
        rim.addColorStop(0, 'rgba(255,200,100,0.3)');
        rim.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = rim;
        ctx.beginPath(); ctx.arc(bx, by, ballR, 0, Math.PI * 2); ctx.fill();

        // Red 5-pointed stars
        ctx.fillStyle = '#cc1100';
        ctx.shadowColor = 'rgba(200,0,0,0.4)';
        ctx.shadowBlur = 2;
        const sR = 3.5;
        if (starCount === 1) {
          drawStar(bx, by, sR);
        } else if (starCount === 2) {
          drawStar(bx, by - 5.5, sR);
          drawStar(bx, by + 5.5, sR);
        } else if (starCount === 3) {
          drawStar(bx, by - 6, sR);
          drawStar(bx - 5.5, by + 3.5, sR);
          drawStar(bx + 5.5, by + 3.5, sR);
        } else if (starCount === 4) {
          drawStar(bx - 5, by - 5, sR);
          drawStar(bx + 5, by - 5, sR);
          drawStar(bx - 5, by + 5, sR);
          drawStar(bx + 5, by + 5, sR);
        } else if (starCount === 5) {
          drawStar(bx, by, sR);
          drawStar(bx - 7, by - 4.5, sR);
          drawStar(bx + 7, by - 4.5, sR);
          drawStar(bx - 7, by + 4.5, sR);
          drawStar(bx + 7, by + 4.5, sR);
        } else if (starCount === 6) {
          for (let s = 0; s < 6; s++) {
            const sa = s * (Math.PI * 2 / 6) - Math.PI / 2;
            drawStar(bx + Math.cos(sa) * 7.5, by + Math.sin(sa) * 7.5, sR);
          }
        } else {
          drawStar(bx, by, sR);
          for (let s = 0; s < 6; s++) {
            const sa = s * (Math.PI * 2 / 6) - Math.PI / 2;
            drawStar(bx + Math.cos(sa) * 7.5, by + Math.sin(sa) * 7.5, sR);
          }
        }
        ctx.shadowBlur = 0;

        // Sparkle trail
        for (let tr = 1; tr <= 6; tr++) {
          const trAngle = angle - tr * 0.05;
          const trx = logoCx + Math.cos(trAngle) * orbitR;
          const trY = logoCy + Math.sin(trAngle) * orbitR;
          const trAlpha = 0.2 * (1 - tr / 7);
          const trSize = 2.5 * (1 - tr * 0.12);
          ctx.fillStyle = `rgba(255,180,30,${trAlpha})`;
          ctx.beginPath(); ctx.arc(trx, trY, trSize, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // === SUBTLE LENS FLARE (when logo appears) ===
    if (phase >= 3 && t < 2.5) {
      const flareT = Math.min((t - 1.2) / 0.3, 1);
      const flareAlpha = Math.sin(flareT * Math.PI) * 0.25 * fadeOut;
      if (flareAlpha > 0.001) {
        const flareR = 200 + flareT * 50;
        const flare = ctx.createRadialGradient(cx, cy, 0, cx, cy, flareR);
        flare.addColorStop(0, `rgba(255,240,200,${flareAlpha})`);
        flare.addColorStop(0.2, `rgba(229,160,13,${flareAlpha * 0.5})`);
        flare.addColorStop(0.5, `rgba(229,160,13,${flareAlpha * 0.1})`);
        flare.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flare;
        ctx.beginPath(); ctx.arc(cx, cy, flareR, 0, Math.PI * 2); ctx.fill();
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    startRef.current = performance.now();
    return () => { window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <div className={`fixed inset-0 z-[200] bg-bg transition-opacity duration-500 ${phase === 5 ? 'opacity-0' : 'opacity-100'}`} dir="ltr">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {/* 3D rotation + glow keyframes */}
      <style>{`
        @keyframes logo3dSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes logo3dEntry {
          0% { transform: scale(0.5) translateY(30px) rotateY(0deg); opacity: 0; }
          60% { transform: scale(0.85) translateY(0px) rotateY(180deg); opacity: 1; }
          100% { transform: scale(1) translateY(0px) rotateY(360deg); opacity: 1; }
        }
        @keyframes redGlowPulse {
          0%, 100% { text-shadow: 0 0 10px #ff1a1a, 0 0 20px #ff1a1a, 0 0 40px rgba(255,26,26,0.6), 0 0 60px rgba(255,26,26,0.3), 0 2px 4px rgba(0,0,0,0.5); }
          50% { text-shadow: 0 0 15px #ff3333, 0 0 30px #ff1a1a, 0 0 60px rgba(255,26,26,0.8), 0 0 90px rgba(255,26,26,0.4), 0 0 120px rgba(255,0,0,0.2), 0 2px 4px rgba(0,0,0,0.5); }
        }
        @keyframes logoBoxGlow {
          0%, 100% { box-shadow: 0 0 60px rgba(229,160,13,0.5), 0 0 120px rgba(229,160,13,0.2); }
          50% { box-shadow: 0 0 80px rgba(229,160,13,0.7), 0 0 150px rgba(229,160,13,0.3), 0 0 200px rgba(255,26,26,0.15); }
        }
        .logo-8k-text {
          animation: redGlowPulse 1.5s ease-in-out infinite;
          -webkit-text-stroke: 2px #ff1a1a;
        }
      `}</style>

      {/* Logo + Text (CSS animated, not canvas) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ direction: 'ltr', perspective: 800 }}>
        {/* Logo icon — 3D rotating */}
        <div style={{ perspective: 800, transformStyle: 'preserve-3d' }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: phase >= 2 ? 1 : 0,
              transformStyle: 'preserve-3d',
              animation: phase >= 3
                ? 'logo3dSpin 4s linear infinite, logoBoxGlow 1.5s ease-in-out infinite'
                : phase >= 2
                  ? 'logo3dEntry 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                  : 'none',
              boxShadow: phase >= 3
                ? '0 0 60px rgba(229,160,13,0.5), 0 0 120px rgba(229,160,13,0.2)'
                : '0 0 20px rgba(229,160,13,0.2)',
            }}
          >
            {/* Front face */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 28,
              background: 'linear-gradient(145deg, #fbbf24, #e5a00d, #b45309)',
              backfaceVisibility: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.15)',
            }}>
              <span className="logo-8k-text" style={{
                fontSize: 72,
                fontWeight: 900,
                color: '#fff',
                fontFamily: 'Inter, Arial, Helvetica, sans-serif',
                letterSpacing: -3,
                direction: 'ltr',
                unicodeBidi: 'bidi-override',
              }}>8K</span>
            </div>
            {/* Back face */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 28,
              background: 'linear-gradient(215deg, #b45309, #e5a00d, #fbbf24)',
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.15)',
            }}>
              <span className="logo-8k-text" style={{
                fontSize: 72,
                fontWeight: 900,
                color: '#fff',
                fontFamily: 'Inter, Arial, Helvetica, sans-serif',
                letterSpacing: -3,
                direction: 'ltr',
                unicodeBidi: 'bidi-override',
              }}>8K</span>
            </div>
          </div>
        </div>

        {/* App name */}
        <div style={{
          marginTop: 24,
          textAlign: 'center',
          opacity: phase >= 3 ? 1 : 0,
          transform: `translateY(${phase >= 3 ? 0 : 20}px)`,
          transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.15s',
        }}>
          <p style={{
            fontSize: 40,
            fontWeight: 700,
            fontFamily: 'Inter, Arial, Helvetica, sans-serif',
            direction: 'ltr',
            unicodeBidi: 'bidi-override',
            letterSpacing: -1.5,
            lineHeight: 1,
          }}>
            <span style={{ color: '#f5f5f5' }}>8K</span>
            <span style={{ color: '#e5a00d' }}>Player</span>
          </p>
          <p style={{
            fontSize: 11,
            color: 'rgba(160,140,100,0.6)',
            letterSpacing: 8,
            marginTop: 10,
            fontFamily: 'Inter, Arial, sans-serif',
            fontWeight: 500,
            opacity: phase >= 4 ? 1 : 0,
            transition: 'opacity 0.5s ease 0.1s',
          }}>PREMIUM IPTV</p>
        </div>

        {/* Loading bar */}
        <div style={{
          marginTop: 40,
          width: 160,
          height: 2,
          borderRadius: 1,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          opacity: phase >= 4 ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}>
          <div style={{
            height: '100%',
            borderRadius: 1,
            background: 'linear-gradient(90deg, #e5a00d, #fbbf24)',
            boxShadow: '0 0 8px rgba(229,160,13,0.5)',
            width: phase >= 4 ? '100%' : '0%',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>
    </div>
  );
}
