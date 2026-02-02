import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MapPin, Star, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHospitals } from "@/hooks/useHospitals";
import { Link } from "react-router-dom";

export const FeaturedHospitals = () => {
  const { data: hospitals, isLoading } = useHospitals();

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Featured Hospitals</h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[280px]">
              <Skeleton className="h-40 w-full rounded-t-lg" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hospitals || hospitals.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Featured Hospitals</h2>
        <Link to="/search" className="text-sm text-primary hover:underline">
          View All
        </Link>
      </div>
      
      <Carousel className="w-full">
        <CarouselContent>
          {hospitals.slice(0, 6).map((hospital) => (
            <CarouselItem key={hospital.id} className="md:basis-1/2 lg:basis-1/3">
              <Link to={`/hospital/${hospital.id}`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="h-40 bg-muted relative">
                    {hospital.images && hospital.images.length > 0 ? (
                      <img 
                        src={hospital.images[0]} 
                        alt={hospital.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${hospital.images && hospital.images.length > 0 ? 'hidden' : ''}`}>
                      <Building2 className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                    {hospital.rating && (
                      <Badge className="absolute top-2 right-2 bg-background/90">
                        <Star className="h-3 w-3 mr-1 fill-warning text-warning" />
                        {hospital.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{hospital.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="line-clamp-1">{hospital.city}, {hospital.state}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hospital.specialties?.slice(0, 2).map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {hospital.specialties && hospital.specialties.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{hospital.specialties.length - 2}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};