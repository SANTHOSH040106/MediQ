import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const SearchBar = () => {
  return (
    <div className="px-4 py-4 bg-muted/30">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search hospitals, doctors, or specialties"
          className="pl-10 pr-12 h-12"
        />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2"
        >
          <MapPin className="h-5 w-5 text-primary" />
        </Button>
      </div>
    </div>
  );
};
