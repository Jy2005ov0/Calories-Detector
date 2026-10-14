import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { LocateFixed } from "lucide-react";
import { t, useLanguage } from "../i18n";
import type { Pt } from "../lib/runTracking";

// The run's map: real streets (OpenStreetMap, drawn by CARTO) with your route on top, a blue dot
// for where you are now and a ring for how sure the GPS is. It follows you as you move; drag the
// map to look around and tap the button to come back. With no internet the streets don't load,
// but the route still draws and records.

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>';

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
      const tiles = L.tileLayer(isDark() ? TILES.dark : TILES.light, { maxZoom: 19, subdomains: "abcd", attribution: ATTRIBUTION, detectRetina: false }).addTo(map);
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

  // Light or dark streets with the app's theme.
  useEffect(() => {
    if (!ready) return;
    const obs = new MutationObserver(() => layers.current?.tiles.setUrl(isDark() ? TILES.dark : TILES.light));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => obs.disconnect();
  }, [ready]);

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
    <div className="run-map" style={height ? { height } : undefined} data-testid="run-map">
      <div ref={box} className="run-map-canvas" role="img" aria-label={t("Map of your route")} />
      {!follow && (
        <button className="run-map-recenter" onClick={recenter} aria-label={t("Back to where I am")}>
          <LocateFixed size={20} />
        </button>
      )}
    </div>
  );
}
