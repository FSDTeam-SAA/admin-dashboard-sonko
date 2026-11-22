import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Pin = { lat: number; lng: number };

// Where the map opens when there is no pin yet.
const BANJUL: Pin = { lat: 13.4549, lng: -16.579 };
const CENTRES: Record<string, Pin> = {
  gambia: { lat: 13.4549, lng: -16.579 },
  gm: { lat: 13.4549, lng: -16.579 },
  senegal: { lat: 14.6928, lng: -17.4467 },
  sn: { lat: 14.6928, lng: -17.4467 },
};

export function startFor(country: string): Pin {
  return CENTRES[country.trim().toLowerCase().replace(/^the /, "")] ?? BANJUL;
}

/** A Google Maps link that opens exactly at the pin. */
export const pinLink = (pin: Pin) => `https://www.google.com/maps/search/?api=1&query=${pin.lat},${pin.lng}`;

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * A free OpenStreetMap map (no Google key, nothing to pay). Click to drop the
 * pin, or drag it. With [readOnly] it only shows the pin.
 */
export function PinMap({ pin, onChange, start, readOnly = false, height = 280 }: { pin: Pin | null; onChange?: (pin: Pin) => void; start: Pin; readOnly?: boolean; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { scrollWheelZoom: false, attributionControl: true }).setView(pin ? [pin.lat, pin.lng] : [start.lat, start.lng], pin ? 17 : 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(m);
    if (!readOnly) m.on("click", (e: L.LeafletMouseEvent) => change.current?.({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is made once; the pin is kept in step below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pin) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const icon = L.divIcon({ className: "pin-map__pin", html: "<span></span>", iconSize: [28, 38], iconAnchor: [14, 36] });
      marker.current = L.marker([pin.lat, pin.lng], { icon, draggable: !readOnly, keyboard: false }).addTo(m);
      marker.current.on("dragend", () => {
        const p = marker.current!.getLatLng();
        change.current?.({ lat: round(p.lat), lng: round(p.lng) });
      });
    } else {
      marker.current.setLatLng([pin.lat, pin.lng]);
    }
    if (!m.getBounds().contains([pin.lat, pin.lng])) m.setView([pin.lat, pin.lng], Math.max(m.getZoom(), 16));
  }, [pin, readOnly]);

  return <div ref={box} className="pin-map" style={{ height }} role="application" aria-label="Map" />;
}
