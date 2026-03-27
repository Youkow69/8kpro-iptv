import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pro8k.iptv',
  appName: '8K Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    // No remote URL = code bundled in APK = direct IPTV connections work
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
