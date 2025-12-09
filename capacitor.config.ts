import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.communitycompass.app',
  appName: 'Community Compass',
  webDir: 'out', // Use static export directory
  // server: {
  //   // url: 'https://ngo-tracker-nu.vercel.app', // Commented out for offline build
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'light', // Light text for dark status bar
      backgroundColor: '#000000',
      overlaysWebView: true, // Allow content to flow under status bar
    },
  },
};

export default config;
