import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { LocateFixed } from "lucide-react";
import { t, useLanguage } from "../i18n";
import type { Pt } from "../lib/runTracking";

// The run's map: real streets from OpenStreetMap (no API key) with your route on top, a blue dot
// for where you are now and a ring for how sure the GPS is. It follows you as you move; drag the
// map to look around and tap the button to come back. In dark mode the streets are dimmed with a
// filter. With no internet the streets don't load, but the route still draws and records.

// Tile servers in order: if one refuses the app's requests, the next takes over.
export const TILE_SOURCES = [
  { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", subdomains: "abc", maxNativeZoom: 19 },
  { url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", subdomains: "abc", maxNativeZoom: 19 },
];
// Credited in plain text: links this small would be too fiddly to tap.
const ATTRIBUTION = "© OpenStreetMap contributors";

const isDark = () => document.documentElement.style.colorScheme === "dark" || (!document.documentElement.style.colorScheme && matchMedia("(prefers-color-scheme: dark)").matches);

interface Layers {
  L: typeof Leaflet;
  map: Leaflet.Map;
  tiles: Leaflet.TileLayer;
  lines: Leaflet.Polyline[];
  start: Leaflet.CircleMarker;
  dot: Leaflet.CircleMarker;
  ring: Leaflet.Circle;
}

export function RunMap({ segments, here, height }: { segments: Pt[][]; here: { lat: number; lng: number; acc: number } | null; height?: string }) {
  useLanguage();
  const box = useRef<HTMLDivElement>(null);
  const layers = useRef<Layers | null>(null);
  const [ready, setReady] = useState(false);
  // Follow the runner until the map is dragged; the button brings it back.
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  followRef.current = follow;

  // Leaflet (and its styles) load only when a map is first shown.
  useEffect(() => {
    let gone = false;
    void Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([mod]) => {
      if (gone || !box.current) return;
      const L = (mod as unknown as { default: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      const map = L.map(box.current, { zoomControl: false, attributionControl: true, center: [3.139, 101.6869], zoom: 16 });
      map.attributionControl.setPrefix(false);
      const layer = (i: number) =>
        L.tileLayer(TILE_SOURCES[i].url, { maxZoom: 19, maxNativeZoom: TILE_SOURCES[i].maxNativeZoom, subdomains: TILE_SOURCES[i].subdomains, attribution: ATTRIBUTION, detectRetina: false });
      let source = 0;
      let tiles = layer(0).addTo(map);
      // A server that fails every tile it's asked for gets swapped for the next one.
      const watch = () => {
        let loaded = 0;
        let failed = 0;
        tiles.on("tileload", () => loaded++);
        tiles.on("tileerror", () => {
          if (++failed < 4 || loaded > 0 || source >= TILE_SOURCES.length - 1 || !navigator.onLine) return;
          tiles.remove();
          tiles = layer(++source).addTo(map);
          if (layers.current) layers.current.tiles = tiles;
          watch();
        });
      };
      watch();
      const start = L.circleMarker([0, 0], { radius: 7, color: "#fff", weight: 3, fillColor: "#34c759", fillOpacity: 1 });
      const ring = L.circle([0, 0], { radius: 10, stroke: false, fillColor: "#0a84ff", fillOpacity: 0.15, interactive: false });
      const dot = L.circleMarker([0, 0], { radius: 8, color: "#fff", weight: 3, fillColor: "#0a84ff", fillOpacity: 1, interactive: false });
      map.on("dragstart", () => setFollow(false));
      layers.current = { L, map, tiles, lines: [], start, dot, ring };
      setReady(true);
    });
    return () => {
      gone = true;
      layers.current?.map.remove();
      layers.current = null;
    };
  }, []);

  // Dimmed streets in dark mode, following the app's theme.
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const update = () => setDark(isDark());
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  // Draw the route: one line per stretch (pauses leave a gap), and a green dot where it began.
  useEffect(() => {
    const l = layers.current;
    if (!l) return;
    const drawn = segments.filter((s) => s.length);
    while (l.lines.length > drawn.length) l.lines.pop()!.remove();
    drawn.forEach((s, i) => {
      const pts = s.map((p) => [p[0], p[1]] as [number, number]);
      if (l.lines[i]) l.lines[i].setLatLngs(pts);
      else l.lines.push(l.L.polyline(pts, { color: "#ff7a00", weight: 6, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(l.map));
    });
    const first = drawn[0]?.[0];
    if (first) l.start.setLatLng([first[0], first[1]]).addTo(l.map);
    else l.start.remove();
  }, [segments, ready]);

  // Where you are now, and keep it in view while following.
  useEffect(() => {
    const l = layers.current;
    if (!l || !here) return;
    l.ring.setLatLng([here.lat, here.lng]).setRadius(Math.max(5, here.acc)).addTo(l.map);
    l.dot.setLatLng([here.lat, here.lng]).addTo(l.map);
    if (followRef.current) l.map.setView([here.lat, here.lng], Math.max(l.map.getZoom(), 16), { animate: true });
  }, [here?.lat, here?.lng, here?.acc, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // The sheet sliding up changes the map's size after it was made.
  useEffect(() => {
    const l = layers.current;
    if (!l || !box.current) return;
    const ro = new ResizeObserver(() => l.map.invalidateSize());
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [ready]);

  const recenter = () => {
    setFollow(true);
    const l = layers.current;
    if (!l) return;
    if (here) l.map.setView([here.lat, here.lng], Math.max(l.map.getZoom(), 16), { animate: true });
    else {
      const all = segments.flat();
      if (all.length) l.map.fitBounds(l.L.latLngBounds(all.map((p) => [p[0], p[1]] as [number, number])), { padding: [30, 30] });
    }
  };

  return (
    <div className={`run-map${dark ? " dark" : ""}`} style={height ? { height } : undefined} data-testid="run-map" role="region" aria-label={t("Map of your route")}>
      <div ref={box} className="run-map-canvas" />
      {!follow && (
        <button className="run-map-recenter" onClick={recenter} aria-label={t("Back to where I am")}>
          <LocateFixed size={20} />
        </button>
      )}
    </div>
  );
}
