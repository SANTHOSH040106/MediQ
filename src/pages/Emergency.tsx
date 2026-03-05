import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, MapPin, Phone, Navigation, Loader2, CheckCircle2, Siren } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
        toast({ title: "Location Error", description: "Unable to get your location. Please enable GPS.", variant: "destructive" });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (!location) return;
    const fetchHospitals = async () => {
      setLoadingHospitals(true);
      const { data, error } = await supabase.rpc("search_hospitals", { limit_count: 50 });
      if (error) {
        toast({ title: "Error", description: "Failed to load hospitals.", variant: "destructive" });
        setLoadingHospitals(false);
        return;
      }
      const withDistance: NearbyHospital[] = (data || [])
        .filter((h: any) => h.latitude && h.longitude)
        .map((h: any) => ({
          ...h,
          distance: getDistanceKm(location.lat, location.lng, Number(h.latitude), Number(h.longitude)),
        }))
        .sort((a: NearbyHospital, b: NearbyHospital) => a.distance - b.distance);
      setHospitals(withDistance);
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
      status: "sent",
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
          <h2 className="text-lg font-semibold mb-3">Nearby Hospitals</h2>
          {loadingHospitals ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : hospitals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {location ? "No hospitals with location data found." : "Enable location to find nearby hospitals."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {hospitals.slice(0, 10).map((hospital) => (
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
                      </div>
                      <Badge variant="secondary" className="shrink-0 ml-3">
                        {hospital.distance.toFixed(1)} km
                      </Badge>
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
