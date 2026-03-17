import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pro8k.iptv',
  appName: '8K Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
