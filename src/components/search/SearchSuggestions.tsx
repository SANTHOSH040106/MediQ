import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, User, Building2, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchSuggestions, SearchSuggestion } from "@/hooks/useSearchSuggestions";
import { cn } from "@/lib/utils";

interface SearchSuggestionsProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export const SearchSuggestions = ({
  className,
  placeholder = "Search doctors, hospitals, or specialties",
  onSearch,
}: SearchSuggestionsProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { suggestions, isLoading, isEmpty } = useSearchSuggestions({
    query,
    enabled: isOpen,
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length >= 2);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setIsOpen(false);
    setQuery("");
    if (suggestion.type === "doctor") {
      navigate(`/doctor/${suggestion.id}`);
    } else {
      navigate(`/hospital/${suggestion.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (onSearch) {
          onSearch(query);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSearchSubmit = () => {
    if (query.trim() && onSearch) {
      onSearch(query.trim());
      setIsOpen(false);
    } else if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && (isLoading || isEmpty || suggestions.length > 0);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-20 h-12"
          autoComplete="off"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClear}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSearchSubmit}
          >
            <MapPin className="h-5 w-5 text-primary" />
          </Button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {isEmpty && !isLoading && (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No doctors or hospitals found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <ul className="py-1 max-h-[320px] overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      selectedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    {suggestion.type === "doctor" ? (
                      <>
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {suggestion.photo ? (
                            <img
                              src={suggestion.photo}
                              alt={suggestion.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            Dr. {suggestion.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {suggestion.specialization}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Doctor
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-secondary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {suggestion.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {suggestion.city}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                          Hospital
                        </span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
