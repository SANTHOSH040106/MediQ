import { Card } from "@/components/ui/card";
import { Heart, Brain, Bone, Eye, Baby, Activity, Stethoscope, Pill } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { name: "Cardiology", icon: Heart, color: "text-accent" },
  { name: "Neurology", icon: Brain, color: "text-primary" },
  { name: "Orthopedics", icon: Bone, color: "text-primary" },
  { name: "Ophthalmology", icon: Eye, color: "text-primary" },
  { name: "Pediatrics", icon: Baby, color: "text-accent" },
  { name: "General Medicine", icon: Stethoscope, color: "text-primary" },
  { name: "Dermatology", icon: Activity, color: "text-warning" },
  { name: "Pharmacy", icon: Pill, color: "text-success" },
];

export const CategoryCards = () => {
  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold mb-4">Browse by Specialty</h2>
      <div className="grid grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link key={category.name} to={`/search?specialty=${category.name.toLowerCase()}`}>
            <Card className="flex flex-col items-center justify-center p-4 h-24 hover:shadow-md transition-shadow cursor-pointer">
              <category.icon className={`h-6 w-6 mb-2 ${category.color}`} />
              <span className="text-xs text-center font-medium">{category.name}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
