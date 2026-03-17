import { useEffect, useRef, useState, Component, ReactNode } from "react";
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
  className: "user-marker-icon",
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  className: "hospital-marker-icon",
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

// Error boundary specifically for the map
class MapErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error("Map error:", error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

const MapFallback = () => (
  <div className="rounded-lg overflow-hidden border border-border shadow-sm flex items-center justify-center bg-muted" style={{ height: 280 }}>
    <p className="text-sm text-muted-foreground">Map could not be loaded</p>
  </div>
);

// Lazy-load react-leaflet components to avoid SSR/init issues
const LazyMapInner = ({ userLocation, hospitals, selectedHospitalId, onSelectHospital }: EmergencyMapProps) => {
  const [ReactLeaflet, setReactLeaflet] = useState<any>(null);
  const prevSelectedId = useRef<string | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    import("react-leaflet").then((mod) => setReactLeaflet(mod)).catch(console.error);
  }, []);

  // Fly to selected hospital
  useEffect(() => {
    if (!mapRef.current || !selectedHospitalId || selectedHospitalId === prevSelectedId.current) return;
    prevSelectedId.current = selectedHospitalId;
    const hospital = hospitals.find((h) => h.id === selectedHospitalId);
    if (hospital?.latitude && hospital?.longitude) {
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [hospital.latitude, hospital.longitude]
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [selectedHospitalId, hospitals, userLocation]);

  if (!ReactLeaflet) {
    return (
      <div className="rounded-lg overflow-hidden border border-border shadow-sm flex items-center justify-center bg-muted" style={{ height: 280 }}>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = ReactLeaflet;

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm" style={{ height: 280 }}>
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup><strong>Your Location</strong></Popup>
        </Marker>
        {hospitals.map((h) =>
          h.latitude && h.longitude ? (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              icon={hospitalIcon}
              eventHandlers={{ click: () => onSelectHospital(h.id) }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{h.name}</strong><br />
                  {h.distance.toFixed(1)} km away
                  {h.phone && (<><br /><a href={`tel:${h.phone}`} className="text-primary">{h.phone}</a></>)}
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
    </div>
  );
};

export const EmergencyMap = (props: EmergencyMapProps) => (
  <MapErrorBoundary fallback={<MapFallback />}>
    <LazyMapInner {...props} />
  </MapErrorBoundary>
);
