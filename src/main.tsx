import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import App from "./App";
import { hydrate } from "./lib/store";
import { hydrateAccount } from "./lib/account";
import { platform } from "./lib/platform";
import "./styles.css";

document.documentElement.dataset.platform = platform;

if (platform === "web" && import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

// Restore saved data before the first render (instant on the web, a few ms in the apps).
Promise.all([hydrate(), hydrateAccount()]).finally(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </StrictMode>,
  ),
);
