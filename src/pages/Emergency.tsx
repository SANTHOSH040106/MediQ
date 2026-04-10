import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AlertTriangle, MapPin, Phone, Navigation, Loader2, CheckCircle2, Siren, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { EmergencyMap } from "@/components/emergency/EmergencyMap";

interface NearbyHospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  distance: number;
  latitude: number | null;
  longitude: number | null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode a hospital address+city to lat/lng using Nominatim
async function geocodeHospital(name: string, address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${name}, ${address}, ${city}, India`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`
    );
    const results = await res.json();
    if (results && results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
    // Fallback: try just city
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", India")}&format=json&limit=1&countrycodes=in`
    );
    const results2 = await res2.json();
    if (results2 && results2.length > 0) {
      return { lat: parseFloat(results2[0].lat), lng: parseFloat(results2[0].lon) };
    }
  } catch {
    // ignore geocoding errors
  }
  return null;
}

// Fallback hospitals for offline / empty database
const FALLBACK_HOSPITALS: NearbyHospital[] = [
  { id: "fallback-1", name: "Government General Hospital", address: "Park Town", city: "Chennai", phone: "044-25305000", distance: 0, latitude: 13.0827, longitude: 80.2707 },
  { id: "fallback-2", name: "AIIMS Delhi", address: "Ansari Nagar", city: "New Delhi", phone: "011-26588500", distance: 0, latitude: 28.5672, longitude: 77.2100 },
  { id: "fallback-3", name: "KEM Hospital", address: "Parel", city: "Mumbai", phone: "022-24136051", distance: 0, latitude: 19.0020, longitude: 72.8410 },
  { id: "fallback-4", name: "Victoria Hospital", address: "Fort", city: "Bangalore", phone: "080-26701150", distance: 0, latitude: 12.9575, longitude: 77.5738 },
  { id: "fallback-5", name: "Coimbatore Medical College Hospital", address: "Avanashi Road", city: "Coimbatore", phone: "0422-2301393", distance: 0, latitude: 11.0168, longitude: 76.9558 },
];

const Emergency = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [searchingManual, setSearchingManual] = useState(false);
  const [manualSearchUsed, setManualSearchUsed] = useState(false);

  const searchByPincodeOrCity = async () => {
    const query = manualQuery.trim();
    if (!query) return;
    setSearchingManual(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        setLocation({ lat: parseFloat(lat), lng: parseFloat(lon) });
        setManualSearchUsed(true);
        toast({ title: "Location Found", description: `Using location for "${results[0].display_name.split(",")[0]}"` });
      } else {
        toast({ title: "Not Found", description: "Could not find that location. Try a different pincode or city name.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to search location. Check your internet connection.", variant: "destructive" });
    }
    setSearchingManual(false);
  };

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation is not supported by your browser.", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast({ title: "Location Error", description: "Unable to get your location. Please enable GPS or search by pincode.", variant: "destructive" });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // Fetch hospitals from DB + geocode missing coordinates + fallback
  useEffect(() => {
    const fetchHospitals = async () => {
      setLoadingHospitals(true);
      const { data, error } = await supabase.rpc("search_hospitals", { limit_count: 100 });

      let allHospitals: NearbyHospital[] = [];

      if (!error && data && data.length > 0) {
        // Map DB hospitals and geocode those missing coordinates
        const mapped: NearbyHospital[] = (data || []).map((h: any) => ({
          id: h.id,
          name: h.name,
          address: h.address || "",
          city: h.city || "",
          phone: h.phone || "",
          latitude: h.latitude ? Number(h.latitude) : null,
          longitude: h.longitude ? Number(h.longitude) : null,
          distance: 0,
        }));

        // Geocode hospitals missing coordinates (batch with delay to respect Nominatim rate limits)
        const needsGeocode = mapped.filter((h) => !h.latitude || !h.longitude);
        for (let i = 0; i < needsGeocode.length; i++) {
          const h = needsGeocode[i];
          if (i > 0) await new Promise((r) => setTimeout(r, 1100)); // Nominatim: 1 req/sec
          const coords = await geocodeHospital(h.name, h.address, h.city);
          if (coords) {
            h.latitude = coords.lat;
            h.longitude = coords.lng;
          }
        }

        allHospitals = mapped;
      } else {
        // Use fallback hospitals when DB is empty or errored
        allHospitals = [...FALLBACK_HOSPITALS];
      }

      // Calculate distances if user location is available
      if (location) {
        allHospitals = allHospitals.map((h) => ({
          ...h,
          distance:
            h.latitude && h.longitude
              ? getDistanceKm(location.lat, location.lng, h.latitude, h.longitude)
              : 9999,
        }));
        allHospitals.sort((a, b) => a.distance - b.distance);
      }

      setHospitals(allHospitals);
      setLoadingHospitals(false);
    };
    fetchHospitals();
  }, [location]);

  const sendAlert = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!selectedHospital || !location) return;
    setSending(true);
    const { error } = await supabase.from("emergency_alerts").insert({
      user_id: user.id,
      hospital_id: selectedHospital,
      latitude: location.lat,
      longitude: location.lng,
      message: message || "Emergency assistance needed",
      status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: "Failed to send emergency alert.", variant: "destructive" });
    } else {
      setAlertSent(true);
      toast({ title: "Alert Sent!", description: "The hospital has been notified of your emergency." });
    }
    setSending(false);
  };

  if (alertSent) {
    const hospital = hospitals.find((h) => h.id === selectedHospital);
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold">Emergency Alert Sent</h1>
          <p className="text-muted-foreground">
            <strong>{hospital?.name}</strong> has been notified. They are preparing for your arrival.
          </p>
          {hospital?.phone && (
            <Button asChild variant="outline" className="gap-2">
              <a href={`tel:${hospital.phone}`}>
                <Phone className="h-4 w-4" /> Call Hospital: {hospital.phone}
              </a>
            </Button>
          )}
          <Button onClick={() => { setAlertSent(false); setSelectedHospital(null); setMessage(""); }}>
            Send Another Alert
          </Button>
        </div>
      </MainLayout>
    );
  }

  const hospitalsWithCoords = hospitals.filter((h) => h.latitude && h.longitude);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Siren className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Emergency Assist</h1>
            <p className="text-sm text-muted-foreground">Get help from the nearest hospital instantly</p>
          </div>
        </div>

        {/* Location Status */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            {locating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                <span className="text-sm font-medium">Detecting your location...</span>
              </>
            ) : location ? (
              <>
                <MapPin className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">
                  Location detected: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
                <Button variant="ghost" size="sm" onClick={getLocation} className="ml-auto text-xs">
                  <Navigation className="h-3 w-3 mr-1" /> Refresh
                </Button>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="text-sm">Location unavailable</span>
                <Button size="sm" variant="outline" onClick={getLocation} className="ml-auto">
                  Enable GPS
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Manual Location Search */}
        {(!location || manualSearchUsed) && (
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              <p className="text-sm font-medium">
                {!location ? "Enter your pincode/city to find hospitals:" : "Search a different location:"}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter pincode or city name..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchByPincodeOrCity()}
                />
                <Button
                  size="sm"
                  onClick={searchByPincodeOrCity}
                  disabled={searchingManual || !manualQuery.trim()}
                  className="shrink-0"
                >
                  {searchingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {manualSearchUsed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setManualSearchUsed(false); getLocation(); }}
                  disabled={locating}
                  className="w-full gap-2"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                  Use my GPS
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Map - show if location exists OR if we have geocoded hospitals */}
        {(location || hospitalsWithCoords.length > 0) && (
          <EmergencyMap
            userLocation={location || { lat: hospitalsWithCoords[0]?.latitude || 20.5937, lng: hospitalsWithCoords[0]?.longitude || 78.9629 }}
            hospitals={hospitals}
            selectedHospitalId={selectedHospital}
            onSelectHospital={setSelectedHospital}
          />
        )}

        {/* Message */}
        <div>
          <label className="text-sm font-medium mb-2 block">Emergency Details (optional)</label>
          <Textarea
            placeholder="Describe your emergency situation..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
          />
        </div>

        {/* Nearby Hospitals */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            {location ? "Nearby Hospitals & Medicals" : "All Hospitals & Medicals"}
            <span className="text-sm font-normal text-muted-foreground ml-2">({hospitals.length})</span>
          </h2>
          {loadingHospitals ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading hospitals & resolving locations...</span>
            </div>
          ) : hospitals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hospitals found. Please try again later.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {hospitals.map((hospital) => (
                <Card
                  key={hospital.id}
                  className={`cursor-pointer transition-all ${
                    selectedHospital === hospital.id
                      ? "ring-2 ring-destructive border-destructive"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedHospital(hospital.id)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{hospital.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {hospital.address}, {hospital.city}
                        </p>
                        {hospital.phone && (
                          <a
                            href={`tel:${hospital.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-primary flex items-center gap-1 mt-1 hover:underline"
                          >
                            <Phone className="h-3 w-3" /> {hospital.phone}
                          </a>
                        )}
                        {!hospital.latitude && (
                          <span className="text-xs text-muted-foreground mt-1 inline-block">📍 Location not on map</span>
                        )}
                      </div>
                      {location && hospital.distance > 0 && hospital.distance < 9999 && (
                        <Badge variant="secondary" className="shrink-0 ml-3">
                          {hospital.distance.toFixed(1)} km
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Send Alert Button */}
        <div className="sticky bottom-20 z-10">
          <Button
            size="lg"
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 h-14 text-lg font-bold shadow-lg"
            disabled={!selectedHospital || !location || sending}
            onClick={sendAlert}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Siren className="h-5 w-5" />
            )}
            {sending ? "Sending Alert..." : "Send Emergency Alert"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Emergency;
