import { Component, type ReactNode } from "react";
import { t } from "../i18n";

/** If a screen ever throws, show a way back instead of a blank app. Saved data is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Calories crashed:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="onboard" role="alert" style={{ justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 48 }} aria-hidden>
          😕
        </div>
        <h1 className="large-title" style={{ marginTop: 12 }}>
          {t("Something went wrong")}
        </h1>
        <p className="subtitle" style={{ maxWidth: 320, margin: "8px auto 24px" }}>
          {t("Your food log and workouts are safe. Reload to carry on where you left off.")}
        </p>
        <button className="btn" onClick={() => location.reload()}>
          {t("Reload")}
        </button>
      </div>
    );
  }
}
