import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "@/components/search/RatingStars";
import {
  MapPin,
  GraduationCap,
  Calendar,
  Clock,
  IndianRupee,
  Star,
  ArrowLeft,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DoctorDetail = () => {
  const { id } = useParams();
  const [doctor, setDoctor] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDoctorData();
    }
  }, [id]);

  // Fields to select - excludes email for security
  const DOCTOR_PUBLIC_FIELDS = `
    id, name, specialization, qualification, experience,
    consultation_fee, rating, total_reviews, hospital_id,
    photo, availability_status, about, education, languages,
    created_at, updated_at
  `;

  const fetchDoctorData = async () => {
    setLoading(true);
    setReviews([]);

    try {
      // Query doctors table directly with explicit field selection (excludes email for security)
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select(`${DOCTOR_PUBLIC_FIELDS}, hospitals(*)`)
        .eq("id", id)
        .maybeSingle();

      if (doctorError) throw doctorError;

      if (!doctorData) {
        setDoctor(null);
        setHospital(null);
        setLoading(false);
        return;
      }

      setDoctor(doctorData);
      setHospital(doctorData.hospitals ?? null);

      const reviewsResult = await supabase
        .from("reviews_ratings")
        .select("*")
        .eq("doctor_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsResult.data) setReviews(reviewsResult.data);
    } catch (e: any) {
      console.error("Failed to load doctor", e);
      toast.error(e?.message ? `Failed to load doctor: ${e.message}` : "Failed to load doctor");
      setDoctor(null);
      setHospital(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!doctor) {
    return (
      <MainLayout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Doctor not found</p>
          <Button asChild className="mt-4">
            <Link to="/search">Back to Search</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const statusConfig = {
    available: { label: "Available", color: "bg-success" },
    busy: { label: "Busy", color: "bg-warning" },
    offline: { label: "Offline", color: "bg-muted" },
  };

  const status = statusConfig[doctor.availability_status as keyof typeof statusConfig];

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/search">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Doctor Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="relative">
                    <img
                      src={doctor.photo || "/placeholder.svg"}
                      alt={doctor.name}
                      className="w-32 h-32 md:w-40 md:h-40 rounded-lg object-cover"
                    />
                    <div className={`absolute -bottom-2 -right-2 ${status.color} text-white text-sm px-3 py-1 rounded-full`}>
                      {status.label}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{doctor.name}</h1>
                      <p className="text-muted-foreground mb-2">{doctor.qualification}</p>
                      <Badge variant="secondary" className="text-base">
                        {doctor.specialization}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-warning text-warning" />
                        <span className="font-bold text-lg">{(doctor.rating ?? 0).toFixed(1)}</span>
                        <span className="text-muted-foreground">({doctor.total_reviews ?? 0} reviews)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{doctor.experience} years experience</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold text-primary">₹{doctor.consultation_fee}</span>
                      <span className="text-muted-foreground">consultation fee</span>
                    </div>

                    {hospital && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <Link to={`/hospital/${hospital.id}`} className="hover:underline">
                          {hospital.name}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{doctor.about}</p>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Education & Qualification</h3>
                  </div>
                  <p className="text-sm text-muted-foreground ml-7">{doctor.education}</p>
                </div>

                {doctor.languages && doctor.languages.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Languages className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Languages</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-7">
                      {doctor.languages.map((language: string) => (
                        <Badge key={language} variant="outline">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Reviews ({reviews.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No reviews yet
                  </p>
                ) : (
                  reviews.map((review, index) => (
                    <div key={review.id}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <RatingStars rating={review.rating} size="sm" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{review.review}</p>
                        </div>
                      </div>
                      {index < reviews.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Booking */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Book Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a convenient time slot to book your appointment with {doctor.name}
                </p>

                <div className="p-4 bg-muted rounded-lg text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Calendar booking coming soon
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => window.location.href = `/booking?doctor=${id}`}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Book Appointment
                </Button>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <span className="font-semibold">₹{doctor.consultation_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={doctor.availability_status === 'available' ? 'default' : 'secondary'}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {hospital && (
              <Card>
                <CardHeader>
                  <CardTitle>Hospital Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{hospital.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {hospital.address}, {hospital.city}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/hospital/${hospital.id}`}>View Hospital Details</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DoctorDetail;