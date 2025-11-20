import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, MapPin, Users, Heart, Shield, Settings, Edit, Loader2 } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Fetch profile data from profiles table
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      } else if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return null;
  }

  const fullName = profile?.full_name || user.user_metadata?.full_name || "User";
  const email = user.email || "";
  const phone = profile?.phone || "Not set";
  const address = profile?.address || "Not set";
  const dateOfBirth = profile?.date_of_birth || "Not set";
  const bloodGroup = profile?.blood_group || "Not set";
  const allergies = profile?.allergies || "Not set";
  const medicalHistory = profile?.medical_history || "Not set";
  const insuranceProvider = profile?.insurance_provider || "Not set";
  const insuranceNumber = profile?.insurance_number || "Not set";

  return (
    <MainLayout>
      <div className="container py-6 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={fullName} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">{fullName}</h1>
                <div className="flex flex-col md:flex-row items-center gap-2 text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{email}</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-center md:justify-start">
                  <Button onClick={() => navigate("/profile/edit")}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Personal Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{address}</p>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Emergency Contact</p>
                <p className="font-medium">Not set</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <CardTitle>Medical Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Blood Group</p>
              <p className="font-medium">{bloodGroup}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Allergies</p>
              <p className="font-medium">{allergies}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Medical History</p>
              <p className="font-medium">{medicalHistory}</p>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Insurance Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Insurance Provider</p>
              <p className="font-medium">{insuranceProvider}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Policy Number</p>
              <p className="font-medium">{insuranceNumber}</p>
            </div>
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Family Members</CardTitle>
              </div>
              <Button variant="outline" size="sm">
                Add Member
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-4">
              No family members added yet
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profile;
