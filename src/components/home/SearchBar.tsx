import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Stethoscope, X, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  name: string;
  type: "hospital" | "doctor";
  subtitle: string;
}

export const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [hospitalsRes, doctorsRes] = await Promise.all([
          supabase.rpc("search_hospitals", {
            search_text: query.trim(),
            limit_count: 4,
            offset_count: 0,
          }),
          supabase.rpc("search_doctors", {
            search_text: query.trim(),
            limit_count: 4,
            offset_count: 0,
          }),
        ]);

        const items: Suggestion[] = [];

        (hospitalsRes.data || []).forEach((h: any) =>
          items.push({
            id: h.id,
            name: h.name,
            type: "hospital",
            subtitle: `${h.city} · ${(h.specialties || []).slice(0, 2).join(", ")}`,
          })
        );

        (doctorsRes.data || []).forEach((d: any) =>
          items.push({
            id: d.id,
            name: d.name,
            type: "doctor",
            subtitle: `${d.specialization} · ${d.experience}yr exp`,
          })
        );

        setSuggestions(items);
        setShowSuggestions(items.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (item: Suggestion) => {
    setShowSuggestions(false);
    setQuery("");
    if (item.type === "hospital") {
      navigate(`/hospital/${item.id}`);
    } else {
      navigate(`/doctor/${item.id}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelect(suggestions[selectedIndex]);
      return;
    }
    if (query.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="px-4 py-4 bg-muted/30" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search doctors, hospitals, or specialties"
          className="pl-10 pr-16 h-12"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <MapPin className="h-5 w-5 text-primary" />
        </div>

        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            {suggestions.map((item, i) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                  i === selectedIndex ? "bg-accent" : ""
                }`}
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {item.type === "hospital" ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Stethoscope className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {item.type}
                </span>
              </button>
            ))}
            {loading && (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">Searching…</div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
