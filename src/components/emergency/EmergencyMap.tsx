import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: "user-marker",
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
});

interface Hospital {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  distance: number;
  phone?: string;
}

interface EmergencyMapProps {
  userLocation: { lat: number; lng: number };
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (id: string) => void;
}

export const EmergencyMap = ({ userLocation, hospitals, selectedHospitalId, onSelectHospital }: EmergencyMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const prevSelectedRef = useRef<string | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // User marker
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup("<strong>📍 Your Location</strong>");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      userMarkerRef.current = null;
    };
  }, []);

  // Update user marker position
  useEffect(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    }
    if (mapRef.current && !hospitals.some((h) => h.latitude && h.longitude)) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [userLocation.lat, userLocation.lng]);

  // Update hospital markers and auto-fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old hospital markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng]]);

    hospitals.forEach((h) => {
      if (!h.latitude || !h.longitude) return;
      const marker = L.marker([h.latitude, h.longitude], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-size:13px"><strong>🏥 ${h.name}</strong><br/>${h.distance > 0 && h.distance < 9999 ? h.distance.toFixed(1) + " km away" : ""}${
            h.phone ? `<br/><a href="tel:${h.phone}">${h.phone}</a>` : ""
          }</div>`
        )
        .on("click", () => onSelectHospital(h.id));
      markersRef.current.set(h.id, marker);
      bounds.extend([h.latitude, h.longitude]);
    });

    // Auto-fit to show all markers
    if (markersRef.current.size > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [hospitals, onSelectHospital, userLocation]);

  // Fly to selected hospital
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedHospitalId || selectedHospitalId === prevSelectedRef.current) return;
    prevSelectedRef.current = selectedHospitalId;

    const hospital = hospitals.find((h) => h.id === selectedHospitalId);
    if (hospital?.latitude && hospital?.longitude) {
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [hospital.latitude, hospital.longitude]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });

      const marker = markersRef.current.get(selectedHospitalId);
      marker?.openPopup();
    }
  }, [selectedHospitalId, hospitals, userLocation]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-border shadow-sm"
      style={{ height: 300 }}
    />
  );
};
