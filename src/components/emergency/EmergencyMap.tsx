import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

function FlyToSelected({ hospital, userLocation }: { hospital: Hospital | undefined; userLocation: { lat: number; lng: number } }) {
  const map = useMap();
  const prevId = useRef<string | null>(null);

  useEffect(() => {
    if (hospital?.latitude && hospital?.longitude && hospital.id !== prevId.current) {
      prevId.current = hospital.id;
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [hospital.latitude, hospital.longitude]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [hospital, map, userLocation]);

  return null;
}

export const EmergencyMap = ({ userLocation, hospitals, selectedHospitalId, onSelectHospital }: EmergencyMapProps) => {
  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <div className="rounded-lg overflow-hidden border border-border shadow-sm" style={{ height: 280 }}>
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User location */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <strong>Your Location</strong>
          </Popup>
        </Marker>

        {/* Hospital markers */}
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
                  <strong>{h.name}</strong>
                  <br />
                  {h.distance.toFixed(1)} km away
                  {h.phone && (
                    <>
                      <br />
                      <a href={`tel:${h.phone}`} className="text-primary">
                        {h.phone}
                      </a>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

        <FlyToSelected hospital={selectedHospital} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
};
