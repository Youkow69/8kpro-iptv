import { useEffect, useRef, useState, useCallback } from 'react';

interface Segment { x: number; y: number; size: number; }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; bright: boolean; }

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const startRef = useRef(0);
  const segsRef = useRef<Segment[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const trailRef = useRef<{ x: number; y: number; a: number }[]>([]);
  const [phase, setPhase] = useState(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 2600),
      setTimeout(() => onFinishRef.current(), 3000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

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
    ctx.clearRect(0, 0, w, h);

    const gA = phase === 5 ? Math.max(0, 1 - (t - 5) / 0.8) : 1;

    // Dragon path (Shenron-style sweeping curves)
    let hx: number, hy: number;
    if (t < 0.5) {
      const p = t / 0.5;
      hx = w + 50 - p * (w / 2 + 50);
      hy = cy - 100 + p * 50;
    } else if (t < 2.2) {
      const p = (t - 0.5) / 1.7;
      const r = 280 * (1 - p * 0.55);
      const a = t * 1.8 + p * Math.PI * 3;
      hx = cx + Math.cos(a) * r * (w / 800);
      hy = cy + Math.sin(a) * r * 0.5 * (h / 600);
    } else if (t < 3.2) {
      const p = (t - 2.2) / 1.0;
      const r = 130 + Math.sin(p * Math.PI * 2) * 15;
      const a = t * 1.8 + p * Math.PI * 4;
      hx = cx + Math.cos(a) * r * (w / 800);
      hy = cy + Math.sin(a) * r * 0.6 * (h / 600);
    } else if (t < 3.8) {
      const p = (t - 3.2) / 0.6;
      hx = cx + 160 * (w / 800) * (1 - p * 0.3);
      hy = cy - 30 * (h / 600);
    } else {
      const p = (t - 3.8) / 1.5;
      const e = p * p;
      hx = cx + 160 * (w / 800) - e * 300;
      hy = cy - 30 * (h / 600) - e * h * 0.8;
    }

    // Segments (longer body for Shenron)
    const segs = segsRef.current;
    const SC = 70;
    if (segs.length === 0) for (let i = 0; i < SC; i++) segs.push({ x: hx + i * 5, y: hy, size: 0 });
    segs[0] = { x: hx, y: hy, size: 14 };
    for (let i = 1; i < segs.length; i++) {
      const prev = segs[i - 1], cur = segs[i];
      const dx = cur.x - prev.x, dy = cur.y - prev.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 4.5) { const r = 4.5 / d; cur.x = prev.x + dx * r; cur.y = prev.y + dy * r; }
      const tp = 1 - i / segs.length;
      // Shenron body: thicker in the middle, tapers at both ends
      const bodyShape = Math.sin(tp * Math.PI);
      cur.size = 13 * bodyShape + 2;
    }

    // Trail glow
    if (phase >= 1 && phase < 5) {
      trailRef.current.push({ x: hx, y: hy, a: 1 });
      if (trailRef.current.length > 100) trailRef.current.shift();
    }
    for (const tr of trailRef.current) {
      tr.a *= 0.93;
      if (tr.a < 0.01) continue;
      const g = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, 25);
      g.addColorStop(0, `rgba(255,180,0,${tr.a * 0.25 * gA})`);
      g.addColorStop(1, 'rgba(255,180,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(tr.x, tr.y, 25, 0, Math.PI * 2); ctx.fill();
    }

    if (phase >= 1) {
      const head = segs[0], neck = segs[3];
      const ha = Math.atan2(head.y - neck.y, head.x - neck.x);

      // --- SHENRON BODY ---
      for (let i = segs.length - 1; i >= 1; i--) {
        const seg = segs[i], prev = segs[i - 1];
        const prog = i / segs.length;
        const sh = Math.sin(t * 6 + i * 0.4) * 0.12 + 0.88;
        const bodyAngle = Math.atan2(seg.y - prev.y, seg.x - prev.x);

        // Dorsal ridge (continuous spiny ridge like Shenron)
        if (i % 2 === 0 && i > 3 && i < segs.length - 5) {
          const spikeLen = seg.size * 0.9 * (1 - Math.abs(prog - 0.4) * 0.8);
          const wave = Math.sin(t * 4 + i * 0.3) * 0.15;
          ctx.save();
          ctx.globalAlpha = gA * 0.7;
          const sGrad = ctx.createLinearGradient(
            seg.x, seg.y,
            seg.x + Math.cos(bodyAngle - Math.PI / 2 + wave) * spikeLen,
            seg.y + Math.sin(bodyAngle - Math.PI / 2 + wave) * spikeLen
          );
          sGrad.addColorStop(0, 'rgba(200,140,10,0.9)');
          sGrad.addColorStop(1, 'rgba(255,200,50,0.15)');
          ctx.fillStyle = sGrad;
          ctx.beginPath();
          ctx.moveTo(
            seg.x + Math.cos(bodyAngle) * 2,
            seg.y + Math.sin(bodyAngle) * 2
          );
          ctx.lineTo(
            seg.x + Math.cos(bodyAngle - Math.PI / 2 + wave) * spikeLen,
            seg.y + Math.sin(bodyAngle - Math.PI / 2 + wave) * spikeLen
          );
          ctx.lineTo(
            seg.x - Math.cos(bodyAngle) * 2,
            seg.y - Math.sin(bodyAngle) * 2
          );
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Legs (Shenron has 2 pairs - at ~20% and ~60% of body)
        const legPositions = [
          { start: 10, end: 16 },  // Front legs
          { start: 38, end: 44 },  // Back legs
        ];
        for (const lp of legPositions) {
          if (i === lp.start || i === lp.start + 3) {
            const side = i === lp.start ? -1 : 1;
            const legLen = seg.size * 2.5;
            const legWave = Math.sin(t * 5 + i * 0.8) * 0.3;
            const legAngle = bodyAngle + (Math.PI / 2) * side + legWave;

            ctx.save();
            ctx.globalAlpha = gA * 0.85;

            // Upper leg
            const kneeX = seg.x + Math.cos(legAngle) * legLen;
            const kneeY = seg.y + Math.sin(legAngle) * legLen;

            ctx.strokeStyle = 'rgba(200,150,20,0.9)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(seg.x, seg.y);
            ctx.lineTo(kneeX, kneeY);
            ctx.stroke();

            // Lower leg
            const footAngle = legAngle + 0.8 * side;
            const footX = kneeX + Math.cos(footAngle) * legLen * 0.7;
            const footY = kneeY + Math.sin(footAngle) * legLen * 0.7;
            ctx.beginPath();
            ctx.moveTo(kneeX, kneeY);
            ctx.lineTo(footX, footY);
            ctx.stroke();

            // Claws (4 fingers like Shenron)
            for (let c = -1.5; c <= 1.5; c += 1) {
              const clawAngle = footAngle + c * 0.25;
              const clawLen = 5;
              ctx.strokeStyle = 'rgba(255,230,150,0.8)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(footX, footY);
              ctx.lineTo(
                footX + Math.cos(clawAngle) * clawLen,
                footY + Math.sin(clawAngle) * clawLen
              );
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // Body glow (golden Shenron)
        const rr = Math.floor(210 * sh + prog * 40);
        const gg = Math.floor(150 * sh - prog * 20);
        const bb = Math.floor(15 * sh);
        const bGlow = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, seg.size * 1.6);
        bGlow.addColorStop(0, `rgba(${rr},${gg},${bb},${0.2 * gA})`);
        bGlow.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
        ctx.fillStyle = bGlow;
        ctx.beginPath(); ctx.arc(seg.x, seg.y, seg.size * 1.6, 0, Math.PI * 2); ctx.fill();

        // Body core
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${0.92 * gA})`;
        ctx.beginPath(); ctx.arc(seg.x, seg.y, seg.size * 0.6, 0, Math.PI * 2); ctx.fill();

        // Scale pattern (Shenron style - overlapping crescents)
        if (i % 2 === 0 && seg.size > 4) {
          ctx.save();
          ctx.translate(seg.x, seg.y);
          ctx.rotate(bodyAngle);
          ctx.globalAlpha = gA * 0.3 * sh;
          ctx.strokeStyle = 'rgba(255,220,80,0.7)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, seg.size * 0.35, -0.8, 0.8);
          ctx.stroke();
          ctx.restore();
        }

        // Yellow underbelly (Shenron's distinctive feature)
        ctx.fillStyle = `rgba(255,235,130,${0.2 * sh * gA})`;
        ctx.beginPath();
        ctx.arc(
          seg.x + Math.cos(bodyAngle + Math.PI / 2) * seg.size * 0.25,
          seg.y + Math.sin(bodyAngle + Math.PI / 2) * seg.size * 0.25,
          seg.size * 0.4, 0, Math.PI * 2
        );
        ctx.fill();

        // Belly segments (horizontal lines like Shenron)
        if (i % 3 === 0 && seg.size > 5) {
          ctx.save();
          ctx.translate(seg.x, seg.y);
          ctx.rotate(bodyAngle);
          ctx.globalAlpha = gA * 0.15 * sh;
          ctx.strokeStyle = 'rgba(255,200,50,0.5)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(-seg.size * 0.3, seg.size * 0.2);
          ctx.lineTo(seg.size * 0.3, seg.size * 0.2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Tail tip (tapers to a point, no fin - Shenron style)
      const tail = segs[segs.length - 1], tailPrev = segs[segs.length - 3];
      const tailA = Math.atan2(tail.y - tailPrev.y, tail.x - tailPrev.x);
      ctx.save();
      ctx.globalAlpha = gA * 0.6;
      ctx.strokeStyle = 'rgba(200,140,10,0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(
        tail.x + Math.cos(tailA) * 15,
        tail.y + Math.sin(tailA) * 15
      );
      ctx.stroke();
      ctx.restore();

      // --- SHENRON DRAGON HEAD ---
      const hGlow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 55);
      hGlow.addColorStop(0, `rgba(255,200,50,${0.35 * gA})`);
      hGlow.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = hGlow;
      ctx.beginPath(); ctx.arc(head.x, head.y, 55, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(ha);
      ctx.globalAlpha = gA;

      // Lower jaw (Shenron has massive jaw)
      const jawOpen = phase >= 3 && t < 4.5 ? Math.sin(Math.min((t - 3.2) * 5, Math.PI)) * 0.35 : Math.sin(t * 3) * 0.06;
      ctx.save();
      ctx.rotate(jawOpen);
      ctx.fillStyle = 'rgb(180,120,10)';
      ctx.beginPath();
      ctx.ellipse(14, 6, 20, 9, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Lower teeth (sharp, T-Rex style like Shenron)
      ctx.fillStyle = 'rgba(255,255,230,0.9)';
      for (let i = 0; i < 5; i++) {
        const tx = 24 - i * 5;
        const th = 4 + (i === 0 || i === 4 ? 0 : 2);
        ctx.beginPath();
        ctx.moveTo(tx - 1.5, 1);
        ctx.lineTo(tx, -th);
        ctx.lineTo(tx + 1.5, 1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Upper head / long snout (Shenron has elongated snout)
      ctx.fillStyle = 'rgb(210,150,15)';
      ctx.beginPath();
      ctx.ellipse(10, -3, 24, 12, -0.05, 0, Math.PI * 2);
      ctx.fill();

      // Brow ridge (heavy, pronounced like Shenron)
      ctx.fillStyle = 'rgb(185,125,10)';
      ctx.beginPath();
      ctx.ellipse(-4, -4, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Snout ridge scales
      ctx.fillStyle = 'rgba(240,180,30,0.5)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(18 - i * 5, -6, 3.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nostrils (crescent-shaped like Shenron)
      ctx.fillStyle = 'rgba(100,60,0,0.8)';
      ctx.beginPath(); ctx.ellipse(28, -5, 2.5, 1.5, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(28, 3, 2.5, 1.5, -0.4, 0, Math.PI * 2); ctx.fill();

      // Nostril smoke/steam
      if (t > 0.8) {
        for (let s = 0; s < 4; s++) {
          const st = (t * 2.5 + s * 0.25) % 1;
          ctx.fillStyle = `rgba(255,140,0,${(1 - st) * 0.2})`;
          ctx.beginPath();
          ctx.arc(30 + st * 20, -2 + Math.sin(t * 6 + s) * 3 + (s - 1.5) * 2, 1.5 + st * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Upper teeth (larger, more menacing)
      ctx.fillStyle = 'rgba(255,255,220,0.9)';
      for (let i = 0; i < 6; i++) {
        const tx = 26 - i * 5;
        const th = 5 + (i === 0 || i === 1 ? 3 : 0); // Front fangs bigger
        ctx.beginPath();
        ctx.moveTo(tx - 1.5, 0);
        ctx.lineTo(tx, th);
        ctx.lineTo(tx + 1.5, 0);
        ctx.closePath();
        ctx.fill();
      }

      // Deer antlers (Shenron's signature - branching like buck antlers)
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.strokeStyle = 'rgba(160,110,40,0.9)';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Main antler trunk
        ctx.beginPath();
        ctx.moveTo(-6, side * 12);
        ctx.bezierCurveTo(-12, side * 24, -18, side * 34, -14, side * 46);
        ctx.stroke();

        // Branch 1 (lower tine)
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-14, side * 28);
        ctx.bezierCurveTo(-20, side * 30, -26, side * 28, -30, side * 24);
        ctx.stroke();

        // Branch 2 (middle tine)
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, side * 36);
        ctx.bezierCurveTo(-22, side * 40, -28, side * 38, -32, side * 34);
        ctx.stroke();

        // Branch 3 (top tine)
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, side * 44);
        ctx.bezierCurveTo(-18, side * 50, -22, side * 52, -20, side * 56);
        ctx.stroke();

        // Antler tips (lighter color)
        ctx.strokeStyle = 'rgba(220,180,100,0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-28, side * 26);
        ctx.lineTo(-30, side * 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-30, side * 36);
        ctx.lineTo(-32, side * 34);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-18, side * 54);
        ctx.lineTo(-20, side * 56);
        ctx.stroke();

        ctx.restore();
      }

      // Fur / mane on cheeks (Shenron's cheek fur)
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.globalAlpha = gA * 0.6;
        for (let f = 0; f < 5; f++) {
          const furWave = Math.sin(t * 3 + f * 0.7) * 3;
          const startX = -2 + f * 2;
          const startY = side * (13 + f * 1.5);
          ctx.strokeStyle = `rgba(220,170,50,${0.5 - f * 0.06})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(
            startX - 5, startY + side * (8 + f * 2) + furWave,
            startX - 10 - f * 2, startY + side * (12 + f * 3) + furWave,
            startX - 14 - f * 3, startY + side * (10 + f * 4) + furWave * 1.5
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // Long whiskers / barbels (catfish-style like Shenron)
      ctx.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        // Main whisker (very long, flowing)
        const wWave1 = Math.sin(t * 3.5) * 8;
        const wWave2 = Math.sin(t * 2.8 + 1) * 6;
        ctx.strokeStyle = 'rgba(255,200,80,0.5)';
        ctx.beginPath();
        ctx.moveTo(8, side * 10);
        ctx.bezierCurveTo(
          20, side * 16 + wWave1,
          40, side * 20 + wWave2,
          60 + Math.sin(t * 4) * 8, side * 16 + wWave1
        );
        ctx.stroke();

        // Second whisker (shorter)
        ctx.strokeStyle = 'rgba(255,200,80,0.35)';
        ctx.beginPath();
        ctx.moveTo(4, side * 12);
        ctx.bezierCurveTo(
          12, side * 22 + wWave2,
          25, side * 28 + wWave1,
          38 + Math.sin(t * 3.2) * 5, side * 26 + wWave2
        );
        ctx.stroke();
      }

      // Eye sockets
      ctx.fillStyle = 'rgba(80,40,0,0.6)';
      ctx.beginPath(); ctx.ellipse(4, -9, 5.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, 9, 5.5, 4.5, 0, 0, Math.PI * 2); ctx.fill();

      // Eyes (Shenron's iconic glowing red eyes)
      for (const side of [-1, 1]) {
        const ey = side * 9;
        // Intense red glow
        const eGlow = ctx.createRadialGradient(5, ey, 0, 5, ey, 12);
        eGlow.addColorStop(0, 'rgba(255,50,0,0.4)');
        eGlow.addColorStop(0.5, 'rgba(255,30,0,0.15)');
        eGlow.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = eGlow;
        ctx.beginPath(); ctx.arc(5, ey, 12, 0, Math.PI * 2); ctx.fill();

        // Iris (deep red like Shenron)
        const iGrad = ctx.createRadialGradient(5, ey, 0, 5, ey, 4.5);
        iGrad.addColorStop(0, 'rgba(255,80,0,1)');
        iGrad.addColorStop(0.5, 'rgba(220,30,0,1)');
        iGrad.addColorStop(1, 'rgba(150,10,0,1)');
        ctx.fillStyle = iGrad;
        ctx.beginPath(); ctx.ellipse(5, ey, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();

        // Slit pupil
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath(); ctx.ellipse(5, ey, 1.2, 3, 0, 0, Math.PI * 2); ctx.fill();

        // Eye highlight
        ctx.fillStyle = 'rgba(255,255,220,0.85)';
        ctx.beginPath(); ctx.arc(6.5, ey - 1.5 * side, 1.2, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();

      // --- FIRE BREATH ---
      if (phase >= 3 && t < 4.5) {
        const fT = Math.min((t - 3.2) / 0.6, 1);
        if (fT > 0) {
          for (let i = 0; i < Math.floor(fT * 12); i++) {
            const angle = Math.atan2(cy - head.y, cx - head.x) + (Math.random() - 0.5) * 0.6;
            const speed = 180 + Math.random() * 250;
            sparksRef.current.push({
              x: head.x + Math.cos(ha) * 28, y: head.y + Math.sin(ha) * 28,
              vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              life: 1, maxLife: 0.3 + Math.random() * 0.5,
              size: 2 + Math.random() * 6, bright: Math.random() > 0.4,
            });
          }
          // Multi-layer fire beam
          for (let layer = 0; layer < 3; layer++) {
            const bEnd = fT;
            const fGrad = ctx.createLinearGradient(
              head.x, head.y,
              head.x + (cx - head.x) * bEnd,
              head.y + (cy - head.y) * bEnd
            );
            const widths = [55, 22, 9];
            const alphas = [0.08, 0.2, 0.5];
            const colors = [
              [`rgba(255,50,0,${alphas[layer] * fT * gA})`, `rgba(255,150,0,${alphas[layer] * 0.5 * fT * gA})`, 'rgba(255,200,0,0)'],
              [`rgba(255,120,0,${alphas[layer] * fT * gA})`, `rgba(255,200,0,${alphas[layer] * 0.5 * fT * gA})`, 'rgba(255,255,100,0)'],
              [`rgba(255,220,100,${alphas[layer] * fT * gA})`, `rgba(255,255,200,${alphas[layer] * 0.3 * fT * gA})`, 'rgba(255,255,255,0)'],
            ];
            fGrad.addColorStop(0, colors[layer][0]);
            fGrad.addColorStop(0.5, colors[layer][1]);
            fGrad.addColorStop(1, colors[layer][2]);
            ctx.strokeStyle = fGrad;
            ctx.lineWidth = widths[layer] * fT;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(head.x + Math.cos(ha) * 25, head.y + Math.sin(ha) * 25);
            ctx.lineTo(head.x + (cx - head.x) * bEnd, head.y + (cy - head.y) * bEnd);
            ctx.stroke();
          }
        }
      }
    }

    // Sparks
    const dt = 1 / 60;
    sparksRef.current = sparksRef.current.filter((s) => {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 40 * dt; s.life -= dt / s.maxLife;
      if (s.life <= 0) return false;
      const a = s.life * gA;
      ctx.fillStyle = s.bright ? `rgba(255,255,150,${a})` : `rgba(255,100,0,${a * 0.8})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2); ctx.fill();
      const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
      sg.addColorStop(0, `rgba(255,180,0,${a * 0.3})`);
      sg.addColorStop(1, 'rgba(255,180,0,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2); ctx.fill();
      return true;
    });

    // --- LOGO 8K --- (rendered via HTML overlay, only flash effect in canvas)
    if (phase >= 3) {
      const lT = Math.min((t - 3.2) / 0.5, 1);
      // Impact flash only
      if (lT > 0 && lT < 0.5) {
        const fR = lT * 2 * 130;
        const fG = ctx.createRadialGradient(cx, cy, 0, cx, cy, fR);
        fG.addColorStop(0, `rgba(255,220,80,${(1 - lT * 2) * 0.7})`);
        fG.addColorStop(1, 'rgba(255,220,80,0)');
        ctx.fillStyle = fG;
        ctx.beginPath(); ctx.arc(cx, cy, fR, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- TEXT ---
    if (phase >= 4) {
      const tT = Math.min((t - 3.8) / 0.6, 1);
      const ease = 1 - Math.pow(1 - tT, 3);
      ctx.save();
      ctx.globalAlpha = ease * gA;
      ctx.translate(cx, cy + 85 + (1 - ease) * 20);

      // Text drawn via HTML overlay to prevent RTL flip on Android WebView

      const bW = 160, bY = 52;
      const bP = Math.min((t - 4) / 1, 1);
      ctx.fillStyle = 'rgba(42,42,69,0.8)';
      ctx.beginPath(); ctx.roundRect(-bW / 2, bY, bW, 2, 1); ctx.fill();
      const lG = ctx.createLinearGradient(-bW / 2, 0, -bW / 2 + bW * bP, 0);
      lG.addColorStop(0, '#eab308'); lG.addColorStop(1, '#d4a017');
      ctx.fillStyle = lG;
      ctx.beginPath(); ctx.roundRect(-bW / 2, bY, bW * bP, 2, 1); ctx.fill();

      ctx.restore();
    }

    // Ambient embers
    if (phase >= 1) {
      for (let i = 0; i < 30; i++) {
        const ex = ((Math.sin(t * 0.3 + i * 7.3) + 1) / 2) * w;
        const ey = ((Math.cos(t * 0.2 + i * 4.1) + 1) / 2) * h;
        const eS = Math.sin(t + i) * 1.5 + 2;
        const eA = (Math.sin(t * 2 + i * 3) * 0.3 + 0.4) * gA;
        ctx.fillStyle = `rgba(212,160,23,${eA * 0.12})`;
        ctx.beginPath(); ctx.arc(ex, ey, eS, 0, Math.PI * 2); ctx.fill();
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [phase]);

  // Initial setup (runs once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => { canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    window.addEventListener('resize', resize);
    startRef.current = performance.now();
    segsRef.current = []; sparksRef.current = []; trailRef.current = [];
    return () => { window.removeEventListener('resize', resize); };
  }, []);

  // Animation loop (restarts when draw changes, but does NOT reset startRef)
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <div className={`fixed inset-0 z-[200] bg-bg transition-opacity duration-700 ${phase === 5 ? 'opacity-0' : 'opacity-100'}`} dir="ltr">
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      {/* HTML overlay for text (canvas text gets flipped on some Android WebViews) */}
      {phase >= 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ direction: 'ltr' }}>
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 112,
              height: 112,
              background: 'linear-gradient(135deg, #eab308, #d4a017, #b45309)',
              boxShadow: '0 0 35px rgba(212,160,23,0.6)',
              opacity: phase >= 3 ? 1 : 0,
              transform: `scale(${phase >= 3 ? 1 : 0.5})`,
              transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ fontSize: 64, fontWeight: 900, color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: -2, direction: 'ltr', unicodeBidi: 'bidi-override' }}>8K</span>
          </div>
          {phase >= 4 && (
            <div className="mt-6 text-center" style={{ opacity: phase >= 4 ? 1 : 0, transform: `translateY(${phase >= 4 ? 0 : 20}px)`, transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <p style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Arial, Helvetica, sans-serif', direction: 'ltr', unicodeBidi: 'bidi-override' }}>
                <span style={{ color: '#f0f0f0' }}>8K</span>
                <span style={{ color: '#d4a017' }}>Player</span>
              </p>
              <p style={{ fontSize: 11, color: 'rgba(136,136,160,0.8)', letterSpacing: 8, marginTop: 8, fontFamily: 'Arial, sans-serif' }}>PREMIUM IPTV</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
