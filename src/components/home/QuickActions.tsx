import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export const QuickActions = () => {
  return (
    <div className="grid grid-cols-2 gap-4 px-4 py-6">
      <Link to="/search">
        <Button className="w-full h-24 flex flex-col gap-2" size="lg">
          <Calendar className="h-6 w-6" />
          <span className="text-sm font-medium">Book Appointment</span>
        </Button>
      </Link>
      
      <Link to="/appointments">
        <Button variant="outline" className="w-full h-24 flex flex-col gap-2" size="lg">
          <Clock className="h-6 w-6" />
          <span className="text-sm font-medium">View Appointments</span>
        </Button>
      </Link>
    </div>
  );
};
