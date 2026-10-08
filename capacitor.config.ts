import type { CapacitorConfig } from "@capacitor/cli";

// For live reload on a device during development:
//   CAP_SERVER_URL=http://<your-computer-ip>:5173 npx cap run android
const devServer = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.caloriesdetector.app",
  appName: "W",
  webDir: "dist",
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
  ios: {
    contentInset: "never",
  },
  android: {
    // Older Android System WebViews lack features the UI relies on (backdrop-filter, dvh).
    minWebViewVersion: 105,
  },
  plugins: {
    SystemBars: {
      // Edge-to-edge on Android with --safe-area-inset-* CSS variables injected into the page.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      // Light icons in dark mode, dark icons in light mode.
      style: "DEFAULT",
    },
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#f2f2f7",
      showSpinner: false,
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
