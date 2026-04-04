import { useMemo, memo } from 'react';

// Known channel brand colors and abbreviations
const BRAND_MAP: Record<string, { abbr: string; colors: [string, string] }> = {
  'bbc': { abbr: 'BBC', colors: ['#1a1a1a', '#cc0000'] },
  'itv': { abbr: 'ITV', colors: ['#1a237e', '#5c6bc0'] },
  'sky sport': { abbr: 'SKY', colors: ['#00205b', '#0065a3'] },
  'sky cinema': { abbr: 'SKY', colors: ['#2c003e', '#7b1fa2'] },
  'sky news': { abbr: 'SKY', colors: ['#9c0000', '#e53935'] },
  'sky mix': { abbr: 'SKY', colors: ['#004d40', '#26a69a'] },
  'sky store': { abbr: 'SKY', colors: ['#311b92', '#7c4dff'] },
  'tnt sport': { abbr: 'TNT', colors: ['#1b1b1b', '#e65100'] },
  'netflix': { abbr: 'N', colors: ['#1a1a1a', '#e50914'] },
  'prime': { abbr: 'P', colors: ['#00a8e1', '#1a3a4a'] },
  'apple tv': { abbr: 'TV+', colors: ['#1a1a1a', '#555555'] },
  'disney': { abbr: 'D+', colors: ['#0e2a5c', '#113ccf'] },
  'canal': { abbr: 'C+', colors: ['#1a1a1a', '#333333'] },
  'tf1': { abbr: 'TF1', colors: ['#e30613', '#ff5722'] },
  'france 2': { abbr: 'F2', colors: ['#f44336', '#e91e63'] },
  'france 3': { abbr: 'F3', colors: ['#2196f3', '#42a5f5'] },
  'france 4': { abbr: 'F4', colors: ['#7b1fa2', '#ab47bc'] },
  'france 5': { abbr: 'F5', colors: ['#4caf50', '#66bb6a'] },
  'france 24': { abbr: 'F24', colors: ['#1565c0', '#42a5f5'] },
  'm6': { abbr: 'M6', colors: ['#f57c00', '#ffb74d'] },
  'w9': { abbr: 'W9', colors: ['#7b1fa2', '#e040fb'] },
  'tmc': { abbr: 'TMC', colors: ['#c62828', '#ef5350'] },
  'arte': { abbr: 'ARTE', colors: ['#f4511e', '#ff8a65'] },
  'bein': { abbr: 'BEIN', colors: ['#f57f17', '#fdd835'] },
  'rmc': { abbr: 'RMC', colors: ['#0d47a1', '#42a5f5'] },
  'eurosport': { abbr: 'ES', colors: ['#1565c0', '#0091ea'] },
  'dazn': { abbr: 'DAZN', colors: ['#0c0c0c', '#f5f5f5'] },
  'hbo': { abbr: 'HBO', colors: ['#1a1a1a', '#7b1fa2'] },
  'cnn': { abbr: 'CNN', colors: ['#cc0000', '#ff1744'] },
  'fox': { abbr: 'FOX', colors: ['#003580', '#1565c0'] },
  'espn': { abbr: 'ESPN', colors: ['#d32f2f', '#ff5252'] },
  'nba': { abbr: 'NBA', colors: ['#1d428a', '#c8102e'] },
  'nfl': { abbr: 'NFL', colors: ['#013369', '#d50a0a'] },
  'discovery': { abbr: 'D', colors: ['#003d6b', '#0097a7'] },
  'nat geo': { abbr: 'NG', colors: ['#ffab00', '#ffd740'] },
  'national geo': { abbr: 'NG', colors: ['#ffab00', '#ffd740'] },
  'nickelodeon': { abbr: 'NICK', colors: ['#f57c00', '#ff9800'] },
  'cartoon': { abbr: 'CN', colors: ['#1a1a1a', '#ffffff'] },
  'mtv': { abbr: 'MTV', colors: ['#1a1a1a', '#ffeb3b'] },
  'paramount': { abbr: 'P+', colors: ['#0064ff', '#2979ff'] },
  'nbc': { abbr: 'NBC', colors: ['#e040fb', '#ffeb3b'] },
  'abc': { abbr: 'ABC', colors: ['#1a1a1a', '#666666'] },
  'cbs': { abbr: 'CBS', colors: ['#033c73', '#2196f3'] },
  'bt sport': { abbr: 'BT', colors: ['#1a0dab', '#6200ea'] },
  'now tv': { abbr: 'NOW', colors: ['#2e7d32', '#4caf50'] },
  'ppv': { abbr: 'PPV', colors: ['#b71c1c', '#f44336'] },
  'rugby': { abbr: 'RBY', colors: ['#1b5e20', '#4caf50'] },
  'cricket': { abbr: 'CKT', colors: ['#33691e', '#8bc34a'] },
  'tennis': { abbr: 'TNS', colors: ['#827717', '#cddc39'] },
  'boxing': { abbr: 'BOX', colors: ['#b71c1c', '#d32f2f'] },
  'ufc': { abbr: 'UFC', colors: ['#1a1a1a', '#d32f2f'] },
  'mma': { abbr: 'MMA', colors: ['#1a1a1a', '#c62828'] },
  'formula': { abbr: 'F1', colors: ['#e10600', '#ff1801'] },
  'motogp': { abbr: 'GP', colors: ['#1a1a1a', '#d32f2f'] },
  'music': { abbr: '♪', colors: ['#6a1b9a', '#ce93d8'] },
  'kids': { abbr: 'KIDS', colors: ['#00bcd4', '#4dd0e1'] },
  'news': { abbr: 'NEWS', colors: ['#b71c1c', '#e53935'] },
  'documentary': { abbr: 'DOC', colors: ['#33691e', '#689f38'] },
  'sport': { abbr: 'SPORT', colors: ['#0d47a1', '#1976d2'] },
  'cinema': { abbr: 'CINE', colors: ['#4a148c', '#7b1fa2'] },
  'relax': { abbr: 'ZEN', colors: ['#004d40', '#00897b'] },
  '4k': { abbr: '4K', colors: ['#ff6f00', '#ffa000'] },
  '8k': { abbr: '8K', colors: ['#d4a017', '#f0c040'] },
  'uhd': { abbr: 'UHD', colors: ['#ff6f00', '#ffa000'] },
  'hevc': { abbr: 'HEVC', colors: ['#37474f', '#607d8b'] },
  'raw': { abbr: 'RAW', colors: ['#455a64', '#78909c'] },
  'fhd': { abbr: 'FHD', colors: ['#e65100', '#ff9100'] },
  'hd': { abbr: 'HD', colors: ['#1565c0', '#42a5f5'] },
  'sd': { abbr: 'SD', colors: ['#546e7a', '#90a4ae'] },
  'ligue 1': { abbr: 'L1', colors: ['#1a237e', '#3f51b5'] },
  'ligue 2': { abbr: 'L2', colors: ['#1a237e', '#5c6bc0'] },
  'la liga': { abbr: 'LIGA', colors: ['#e65100', '#ff6d00'] },
  'serie a': { abbr: 'SA', colors: ['#1b5e20', '#4caf50'] },
  'bundesliga': { abbr: 'BL', colors: ['#d32f2f', '#ef5350'] },
  'premier league': { abbr: 'EPL', colors: ['#380050', '#7b1fa2'] },
  'champions': { abbr: 'UCL', colors: ['#1a237e', '#283593'] },
  'uefa': { abbr: 'UEFA', colors: ['#1a237e', '#304ffe'] },
  'fifa': { abbr: 'FIFA', colors: ['#1565c0', '#1e88e5'] },
};

// Generate consistent hash from string
function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Modern gradient palettes for unknown channels
const GRADIENT_PALETTES: [string, string][] = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f5576c', '#ff6f91'],
  ['#5ee7df', '#b490ca'],
  ['#c471f5', '#fa71cd'],
  ['#48c6ef', '#6f86d6'],
  ['#feada6', '#f5efef'],
  ['#a1c4fd', '#c2e9fb'],
  ['#d4fc79', '#96e6a1'],
  ['#84fab0', '#8fd3f4'],
  ['#cfd9df', '#e2ebf0'],
  ['#ffecd2', '#fcb69f'],
  ['#ff9a9e', '#fad0c4'],
  ['#fbc2eb', '#a6c1ee'],
];

function getBrandInfo(name: string): { abbr: string; colors: [string, string] } | null {
  const lower = name.toLowerCase();
  // Check longer keys first for specificity
  const sorted = Object.keys(BRAND_MAP).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (lower.includes(key)) {
      return BRAND_MAP[key];
    }
  }
  return null;
}

function getAbbreviation(name: string): string {
  // Remove country prefix like "FR|", "UK|", "US|" etc.
  const cleaned = name.replace(/^[A-Z]{2,3}\|\s*/i, '').trim();
  // Remove quality suffixes
  const noQuality = cleaned
    .replace(/\s*(ᵁᴴᴰ|ᴴᴰ|ᴿᴬᵂ|ʰᵉᵛᶜ|⁴ᴷ|⁸ᴷ|ᶠᴴᴰ|ˢᴰ|ⱽᴵᴾ|ᴰᴼᴸᴮʸ|ᴬᵁᴰᴵᴼ|³⁸⁴⁰ᴾ|⁶⁰ᶠᵖˢ|☼|PPV)\s*/gi, '')
    .trim();

  if (!noQuality) return cleaned.charAt(0).toUpperCase();

  const words = noQuality.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  // Take first letter of each word (max 4)
  return words
    .slice(0, 4)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

/** Get the brand glow color for a channel name */
export function getChannelGlowColor(name: string): string {
  const brand = getBrandInfo(name);
  if (brand) return brand.colors[1];
  const hash = hashStr(name);
  return GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length][0];
}

interface ChannelLogoProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default memo(function ChannelLogo({ name, size = 'md', className = '' }: ChannelLogoProps) {
  const { abbr, fontSize } = useMemo(() => {
    const brand = getBrandInfo(name);
    const hash = hashStr(name);

    let abbr: string;
    let colors: [string, string];

    if (brand) {
      abbr = brand.abbr;
      colors = brand.colors;
    } else {
      abbr = getAbbreviation(name);
      colors = GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length];
    }

    // Determine text color based on gradient brightness
    const isDark = colors[0].startsWith('#1') || colors[0].startsWith('#0') || colors[0] === '#1a1a1a';
    const textColor = isDark ? '#ffffff' : '#000000';

    // Font size based on abbreviation length
    let fontSize: string;
    if (size === 'xs') {
      if (abbr.length <= 2) fontSize = 'text-[8px]';
      else fontSize = 'text-[6px]';
    } else if (abbr.length <= 1) fontSize = 'text-lg';
    else if (abbr.length <= 2) fontSize = 'text-sm';
    else if (abbr.length <= 3) fontSize = 'text-xs';
    else fontSize = 'text-[9px]';

    return {
      abbr,
      gradient: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
      textColor,
      fontSize,
    };
  }, [name, size]);

  const sizeClasses = {
    xs: 'w-6 h-6 rounded',
    sm: 'w-8 h-8 rounded-md',
    md: 'w-12 h-12 rounded-lg',
    lg: 'w-16 h-16 rounded-xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center shrink-0 relative ${className}`}
    >
      <span
        className={`${fontSize} font-black tracking-tight leading-none select-none relative`}
        style={{
          color: '#ffffff',
          textShadow: '0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(255,180,30,0.3)',
          letterSpacing: abbr.length > 3 ? '-0.05em' : '0',
        }}
      >
        {abbr}
      </span>
    </div>
  );
})
