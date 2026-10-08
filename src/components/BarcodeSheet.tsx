import { useEffect, useRef, useState, type FormEvent } from "react";
import { Barcode, CameraOff, PencilLine } from "lucide-react";
import { t, useLanguage } from "../i18n";
import { lookupBarcode } from "../lib/api";
import type { Food } from "../lib/types";
import { Sheet, haptic } from "./ui";

type Status = { kind: "scanning" } | { kind: "no-camera" } | { kind: "looking"; code: string } | { kind: "not-found"; code: string } | { kind: "error"; message: string };

/** Scan a product barcode with the camera (or type it) and look it up in Open Food Facts. */
export function BarcodeSheet({ open, onClose, onFound, onNewFood }: { open: boolean; onClose: () => void; onFound: (f: Food) => void; onNewFood: () => void }) {
  useLanguage();
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "scanning" });
  const [code, setCode] = useState("");
  const busy = useRef(false);

  const lookup = async (raw: string) => {
    const c = raw.replace(/\D/g, "");
    if (c.length < 8 || busy.current) return;
    busy.current = true;
    setStatus({ kind: "looking", code: c });
    try {
      const food = await lookupBarcode(c);
      if (food) {
        haptic("success");
        onFound(food);
      } else setStatus({ kind: "not-found", code: c });
    } catch {
      setStatus({ kind: "error", message: t("Couldn't reach the product database. Check your connection.") });
    } finally {
      busy.current = false;
    }
  };

  // Live camera scanning while the sheet is open.
  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "scanning" });
    setCode("");
    let stop = () => {};
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setStatus({ kind: "no-camera" });
      try {
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import("@zxing/library");
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]]]);
        const reader = new BrowserMultiFormatReader(hints, 250);
        stop = () => reader.reset();
        if (cancelled || !video.current) return stop();
        await reader.decodeFromConstraints({ video: { facingMode: "environment" }, audio: false }, video.current, (result) => {
          if (result && !busy.current) lookup(result.getText());
        });
      } catch {
        if (!cancelled) setStatus({ kind: "no-camera" });
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    lookup(code);
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("Scan barcode")}>
      <div className="scanner">
        {status.kind === "no-camera" ? (
          <div className="scanner-empty">
            <CameraOff size={30} />
            <span>{t("Camera not available. Type the number under the barcode instead.")}</span>
          </div>
        ) : (
          <>
            <video ref={video} muted playsInline aria-label={t("Camera view")} />
            <div className="scanner-frame" aria-hidden />
          </>
        )}
      </div>
      <p className="footnote" role="status" style={{ textAlign: "center" }}>
        {status.kind === "looking"
          ? t("Looking up {code}…", { code: status.code })
          : status.kind === "not-found"
            ? t("{code} isn't in the database yet.", { code: status.code })
            : status.kind === "error"
              ? status.message
              : status.kind === "scanning"
                ? t("Point the camera at the barcode on the pack.")
                : ""}
      </p>
      {status.kind === "not-found" && (
        <button className="btn tinted" onClick={onNewFood}>
          <PencilLine size={17} /> {t("Add it as a new food")}
        </button>
      )}
      <div className="section-header">{t("Or type the number")}</div>
      <form className="group" onSubmit={submit}>
        <div className="field">
          <Barcode size={18} className="muted" />
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="9556001234567"
            aria-label={t("Barcode number")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ textAlign: "left", flex: 1 }}
          />
          <button className="btn small" type="submit" disabled={code.replace(/\D/g, "").length < 8 || status.kind === "looking"}>
            {t("Look up")}
          </button>
        </div>
      </form>
      <p className="footnote">{t("Product data from Open Food Facts, a free database of millions of foods.")}</p>
    </Sheet>
  );
}
