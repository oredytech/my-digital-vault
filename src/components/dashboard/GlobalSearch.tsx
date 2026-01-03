import { useState, useEffect } from "react";
import { Search, Link2, Users, Lightbulb, Bell, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocalDatabase } from "@/hooks/useLocalDatabase";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "link" | "account" | "idea" | "reminder";
  title: string;
  subtitle?: string;
}

interface Link {
  id: string;
  title: string;
  url: string;
}

interface Account {
  id: string;
  name: string;
  email?: string;
}

interface Idea {
  id: string;
  title: string;
  content?: string;
}

interface Reminder {
  id: string;
  title: string;
  description?: string;
}

interface GlobalSearchProps {
  onSelectSection: (section: string) => void;
}

export function GlobalSearch({ onSelectSection }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { getData, isInitialized } = useLocalDatabase();

  useEffect(() => {
    if (query.length < 2 || !isInitialized) {
      setResults([]);
      return;
    }

    const searchAll = async () => {
      const searchTerm = query.toLowerCase();
      
      const [links, accounts, ideas, reminders] = await Promise.all([
        getData<Link>("links"),
        getData<Account>("accounts"),
        getData<Idea>("ideas"),
        getData<Reminder>("reminders"),
      ]);

      const combined: SearchResult[] = [
        ...links
          .filter(l => l.title.toLowerCase().includes(searchTerm))
          .slice(0, 5)
          .map(l => ({ id: l.id, type: "link" as const, title: l.title, subtitle: l.url })),
        ...accounts
          .filter(a => a.name.toLowerCase().includes(searchTerm))
          .slice(0, 5)
          .map(a => ({ id: a.id, type: "account" as const, title: a.name, subtitle: a.email || undefined })),
        ...ideas
          .filter(i => i.title.toLowerCase().includes(searchTerm))
          .slice(0, 5)
          .map(i => ({ id: i.id, type: "idea" as const, title: i.title, subtitle: i.content?.slice(0, 50) })),
        ...reminders
          .filter(r => r.title.toLowerCase().includes(searchTerm))
          .slice(0, 5)
          .map(r => ({ id: r.id, type: "reminder" as const, title: r.title, subtitle: r.description || undefined })),
      ];

      setResults(combined);
    };

    const debounce = setTimeout(searchAll, 300);
    return () => clearTimeout(debounce);
  }, [query, isInitialized, getData]);

  const getIcon = (type: string) => {
    switch (type) {
      case "link": return <Link2 className="w-4 h-4" />;
      case "account": return <Users className="w-4 h-4" />;
      case "idea": return <Lightbulb className="w-4 h-4" />;
      case "reminder": return <Bell className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleSelect = (result: SearchResult) => {
    const sectionMap: Record<string, string> = {
      link: "links",
      account: "accounts",
      idea: "ideas",
      reminder: "reminders",
    };
    onSelectSection(sectionMap[result.type]);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-8 bg-muted/50 border-border/50 focus:bg-background"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left",
                "border-b border-border/50 last:border-b-0"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {getIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{result.title}</p>
                {result.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground capitalize px-2 py-1 bg-muted rounded">
                {result.type === "link" ? "Lien" : result.type === "account" ? "Compte" : result.type === "idea" ? "Idée" : "Rappel"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
