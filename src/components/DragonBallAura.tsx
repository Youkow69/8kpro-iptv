import { useMemo, memo } from 'react';

interface Props {
  streamId: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Dragon Ball aura effect behind channel logos and category icons.
 * Pure CSS — no canvas, no performance hit on large lists.
 */
export default memo(function DragonBallAura({ streamId, size = 'md' }: Props) {
  const starCount = useMemo(() => (streamId % 7) + 1, [streamId]);
  const delay = useMemo(() => (streamId % 20) * 0.15, [streamId]);

  // Ball is larger than container so it peeks around the logo
  const ballSize = size === 'xs' ? 28 : size === 'sm' ? 48 : size === 'lg' ? 80 : 68;
  const starSize = size === 'xs' ? 2 : size === 'sm' ? 3.5 : size === 'lg' ? 5.5 : 4.5;
  const starSpread = size === 'xs' ? 4 : size === 'sm' ? 7 : size === 'lg' ? 12 : 9;

  // Position stars inside the ball based on count
  const stars = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    const cx = ballSize / 2;
    const cy = ballSize / 2;
    if (starCount === 1) {
      positions.push({ x: cx, y: cy });
    } else if (starCount === 2) {
      positions.push({ x: cx, y: cy - starSpread * 0.7 }, { x: cx, y: cy + starSpread * 0.7 });
    } else if (starCount === 3) {
      positions.push({ x: cx, y: cy - starSpread }, { x: cx - starSpread * 0.8, y: cy + starSpread * 0.5 }, { x: cx + starSpread * 0.8, y: cy + starSpread * 0.5 });
    } else if (starCount === 4) {
      positions.push({ x: cx - starSpread * 0.6, y: cy - starSpread * 0.6 }, { x: cx + starSpread * 0.6, y: cy - starSpread * 0.6 }, { x: cx - starSpread * 0.6, y: cy + starSpread * 0.6 }, { x: cx + starSpread * 0.6, y: cy + starSpread * 0.6 });
    } else if (starCount === 5) {
      positions.push({ x: cx, y: cy });
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI * 2) / 4 - Math.PI / 4;
        positions.push({ x: cx + Math.cos(a) * starSpread, y: cy + Math.sin(a) * starSpread });
      }
    } else if (starCount === 6) {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
        positions.push({ x: cx + Math.cos(a) * starSpread, y: cy + Math.sin(a) * starSpread });
      }
    } else {
      positions.push({ x: cx, y: cy });
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
        positions.push({ x: cx + Math.cos(a) * starSpread, y: cy + Math.sin(a) * starSpread });
      }
    }
    return positions;
  }, [starCount, ballSize, starSpread]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Outer aura glow — hidden on xs */}
      {size !== 'xs' && (
        <div
          className="absolute db-aura-outer"
          style={{
            width: ballSize * 1.8,
            height: ballSize * 1.8,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,40,40,0.4) 0%, rgba(200,20,0,0.15) 40%, rgba(150,0,0,0.05) 65%, transparent 80%)',
            animationDelay: `${delay}s`,
          }}
        />
      )}
      {/* Inner aura ring — hidden on xs */}
      {size !== 'xs' && (
        <div
          className="absolute db-aura-inner"
          style={{
            width: ballSize * 1.3,
            height: ballSize * 1.3,
            borderRadius: '50%',
            border: '1px solid rgba(255,50,50,0.2)',
            boxShadow: '0 0 12px rgba(255,40,40,0.3), inset 0 0 8px rgba(255,80,80,0.1)',
            animationDelay: `${delay + 0.3}s`,
          }}
        />
      )}
      {/* Dragon Ball sphere */}
      <div
        className="absolute db-ball"
        style={{
          width: ballSize,
          height: ballSize,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #ff6666 0%, #e03030 20%, #cc1010 50%, #990000 80%, #660000 100%)',
          boxShadow: '0 0 20px rgba(255,40,40,0.5), 0 0 40px rgba(200,0,0,0.2), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,200,200,0.3)',
          animationDelay: `${delay}s`,
        }}
      >
        {/* Specular highlight */}
        <div
          className="absolute"
          style={{
            top: '12%',
            left: '20%',
            width: '40%',
            height: '35%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.6) 0%, rgba(255,200,200,0.25) 50%, transparent 100%)',
          }}
        />
        {/* Secondary highlight */}
        <div
          className="absolute"
          style={{
            top: '8%',
            left: '25%',
            width: '20%',
            height: '18%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 100%)',
          }}
        />
        {/* Red stars */}
        {stars.map((pos, i) => (
          <svg
            key={i}
            className="absolute"
            style={{
              left: pos.x - starSize,
              top: pos.y - starSize,
              width: starSize * 2,
              height: starSize * 2,
              filter: 'drop-shadow(0 0 1px rgba(200,180,0,0.5))',
            }}
            viewBox="0 0 10 10"
          >
            <polygon
              points="5,0.5 6.2,3.8 9.8,3.8 6.8,6 7.8,9.5 5,7.2 2.2,9.5 3.2,6 0.2,3.8 3.8,3.8"
              fill="#ffcc00"
            />
          </svg>
        ))}
        {/* Rim light */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 70% 75%, rgba(255,150,150,0.25) 0%, transparent 50%)',
          }}
        />
      </div>
    </div>
  );
})
