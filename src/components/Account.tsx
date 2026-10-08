import { useState } from "react";
import { Cloud, CloudOff, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { deleteAccount, signOut, useAccount, type Provider } from "../lib/account";
import { confirmDialog } from "../lib/platform";
import { EmailAuthSheet } from "./Auth";
import { showToast, useNow } from "./ui";

const PROVIDER_LABEL: Record<Provider, string> = { password: "Email", google: "Google", apple: "Apple" };

function syncText(status: string, lastSyncedAt: number | null, now: number) {
  if (status === "syncing") return "Syncing…";
  if (status === "offline") return "Offline · will sync when you're back online";
  if (status === "error") return "Couldn't sync · will retry";
  if (!lastSyncedAt) return "Backed up to your account";
  const mins = Math.floor((now - lastSyncedAt) / 60000);
  return `Synced ${mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : `${Math.floor(mins / 60)} h ago`}`;
}

/** Account status at the top of Profile: sign-in prompt for guests, sync status and controls when signed in. */
export function AccountCard() {
  const acc = useAccount();
  const now = useNow(30_000);
  const [sheet, setSheet] = useState<"signup" | "login" | null>(null);

  if (!acc.token || !acc.user) {
    return (
      <>
        <div className="card">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div className="icon-tile" style={{ width: 44, height: 44, borderRadius: 12, background: "var(--blue)" }}>
              <Cloud size={22} />
            </div>
            <div className="row-main">
              <div style={{ fontWeight: 700 }}>Back up & sync</div>
              <div className="row-sub" style={{ whiteSpace: "normal" }}>
                Create a free account to keep your data safe and use it on all your phones.
              </div>
            </div>
          </div>
          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="btn secondary" onClick={() => setSheet("login")}>
              Log in
            </button>
            <button className="btn" onClick={() => setSheet("signup")}>
              Create account
            </button>
          </div>
        </div>
        <EmailAuthSheet open={sheet !== null} mode={sheet ?? "signup"} onClose={() => setSheet(null)} />
      </>
    );
  }

  const u = acc.user;
  const display = u.name || u.email || "Your account";
  const offline = acc.status === "offline" || acc.status === "error";
  return (
    <div className="group" data-testid="account">
      <div className="row" style={{ paddingBlock: 14 }}>
        <div className="avatar" aria-hidden>
          {display.trim()[0]?.toUpperCase()}
        </div>
        <div className="row-main">
          <div style={{ fontWeight: 700, fontSize: 19 }} className="row-title">
            {display}
          </div>
          {u.email && u.name && <div className="row-sub">{u.email}</div>}
          <div className="pill-list" style={{ marginTop: 6 }}>
            {u.providers.map((p) => (
              <span key={p} className="badge">
                {PROVIDER_LABEL[p]}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="row" role="status" aria-live="polite">
        {acc.status === "syncing" ? (
          <RefreshCw size={17} color="var(--blue)" />
        ) : offline ? (
          <CloudOff size={17} color="var(--orange)" />
        ) : (
          <Cloud size={17} color="var(--green)" />
        )}
        <div className="row-main row-sub" style={{ color: "var(--label)" }}>
          {syncText(acc.status, acc.lastSyncedAt, now)}
        </div>
      </div>
      <button
        className="row"
        onClick={async () => {
          await signOut();
          showToast("Signed out · your data stays on this phone");
        }}
      >
        <LogOut size={17} color="var(--blue)" />
        <span style={{ color: "var(--blue)" }}>Sign out</span>
      </button>
      <button
        className="row"
        onClick={async () => {
          if (
            await confirmDialog(
              "Delete account?",
              "Your account and everything backed up to it will be permanently deleted. Data on this phone is kept.",
              "Delete account",
            )
          ) {
            try {
              await deleteAccount();
              showToast("Account deleted");
            } catch (e) {
              showToast((e as Error).message);
            }
          }
        }}
      >
        <Trash2 size={17} color="var(--red)" />
        <span style={{ color: "var(--red)" }}>Delete account</span>
      </button>
    </div>
  );
}
