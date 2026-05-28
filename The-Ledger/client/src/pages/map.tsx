import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type PlaceResult = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lon: number;
  source: "place";
};

type ClientResult = {
  id: string;
  name: string;
  address?: string;
  source: "client";
};

type JobResult = {
  id: string;
  title: string;
  address?: string;
  status?: string;
  lat?: number;
  lon?: number;
  source: "job";
};

type SearchResult = PlaceResult | ClientResult | JobResult;

function FlyTo({ lat, lon, zoom }: { lat: number; lon: number; zoom?: number }) {
  const map = useMap();
  // Imperative move when props change
  map.flyTo([lat, lon], zoom ?? Math.max(map.getZoom(), 14), { duration: 0.8 });
  return null;
}

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      // Helps Nominatim usage policy (best-effort in browser)
      "Accept": "application/json",
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as any[];
  return (data || []).map((d, idx) => ({
    id: `place-${d.place_id || idx}`,
    name: d.display_name || q,
    address: d.display_name,
    lat: Number(d.lat),
    lon: Number(d.lon),
    source: "place",
  }));
}

export default function MapPage() {
  const { jobs, clients } = useStore();
  const [, setLocation] = useLocation();

  // Filter jobs with coordinates
  const mapJobs = jobs.filter((j) => j.latitude && j.longitude);
  const centerPosition =
    mapJobs.length > 0
      ? ([mapJobs[0].latitude!, mapJobs[0].longitude!] as [number, number])
      : ([47.6062, -122.3321] as [number, number]); // Default to Seattle

  const [mode, setMode] = useState<"place" | "client" | "job">("place");
  const [query, setQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const lastPlaceSearchAt = useRef<number>(0);

  const clientResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as ClientResult[];

    return clients
      .filter((c) => {
        const hay = `${c.name} ${c.clientId} ${c.billingAddress} ${c.email}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8)
      .map((c) => ({
        id: c.id,
        name: c.name,
        address: c.billingAddress,
        source: "client" as const,
      }));
  }, [clients, query]);

  const jobResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as JobResult[];

    return jobs
      .filter((j) => {
        const hay = `${j.title} ${j.jobId} ${j.locationAddress} ${j.status}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 10)
      .map((j) => ({
        id: j.id,
        title: j.title,
        address: j.locationAddress,
        status: j.status,
        lat: j.latitude,
        lon: j.longitude,
        source: "job" as const,
      }));
  }, [jobs, query]);

  const results = useMemo(() => {
    if (!query.trim()) return [] as SearchResult[];
    if (mode === "place") return placeResults;
    if (mode === "client") return clientResults;
    return jobResults;
  }, [mode, query, placeResults, clientResults, jobResults]);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) {
      setPlaceResults([]);
      return;
    }

    if (mode !== "place") return;

    // Respect public Nominatim (rough 1 req/sec)
    const now = Date.now();
    const msSince = now - lastPlaceSearchAt.current;
    if (msSince < 1100) {
      await new Promise((r) => setTimeout(r, 1100 - msSince));
    }

    setIsSearching(true);
    lastPlaceSearchAt.current = Date.now();
    try {
      const found = await searchPlaces(q);
      setPlaceResults(found);
    } finally {
      setIsSearching(false);
    }
  };

  const onPick = (r: SearchResult) => {
    if (r.source === "place") {
      setSelected({ lat: r.lat, lon: r.lon, label: r.name });
      return;
    }

    if (r.source === "client") {
      // Navigate to client page (client itself may have many jobs)
      setLocation(`/clients/${r.id}`);
      return;
    }

    // job
    if (r.lat && r.lon) {
      setSelected({ lat: r.lat, lon: r.lon, label: r.title });
    }
    setLocation(`/jobs/${r.id}`);
  };

  const clear = () => {
    setQuery("");
    setPlaceResults([]);
    setSelected(null);
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] w-full rounded-xl overflow-hidden border border-border relative">
        {/* Search (collapsible) */}
        <div className="absolute top-4 left-[52px] z-[450] pointer-events-none">
          <div className="pointer-events-auto flex items-start gap-2">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-10 w-10 shadow-lg"
              onClick={() => setSearchOpen((s) => !s)}
              data-testid="button-map-search-toggle"
              aria-label={searchOpen ? "Close search" : "Open search"}
            >
              <Search className="h-5 w-5" />
            </Button>

            {searchOpen && (
              <div className="w-[min(720px,calc(100vw-6rem))] rounded-xl border border-border bg-background/90 backdrop-blur shadow-lg">
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            runSearch();
                          }
                        }}
                        placeholder={mode === "place" ? "Search a place or address…" : mode === "client" ? "Search clients…" : "Search jobs…"}
                        className="pr-10"
                        data-testid="input-map-search"
                        autoFocus
                      />
                      {query.trim().length > 0 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={clear}
                          data-testid="button-map-search-clear"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button
                      onClick={runSearch}
                      disabled={mode !== "place" || isSearching || !query.trim()}
                      data-testid="button-map-search"
                    >
                      {isSearching ? "Searching" : "Search"}
                    </Button>
                  </div>

                  <Tabs
                    value={mode}
                    onValueChange={(v) => {
                      setMode(v as any);
                      setPlaceResults([]);
                      setSelected(null);
                    }}
                  >
                    <TabsList className="w-full" data-testid="tabs-map-search">
                      <TabsTrigger value="place" className="flex-1" data-testid="tab-map-search-place">Place</TabsTrigger>
                      <TabsTrigger value="client" className="flex-1" data-testid="tab-map-search-client">Client</TabsTrigger>
                      <TabsTrigger value="job" className="flex-1" data-testid="tab-map-search-job">Job</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {query.trim().length > 0 && (
                    <div className="max-h-56 overflow-auto rounded-lg border border-border bg-background">
                      {results.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground" data-testid="text-map-search-empty">
                          {mode === "place" ? "Press Search to look up places." : "No matches."}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {results.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => onPick(r)}
                              className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                              data-testid={`button-map-result-${r.source}-${r.id}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium text-sm truncate" data-testid={`text-map-result-title-${r.source}-${r.id}`}>
                                    {r.source === "job" ? r.title : r.name}
                                  </div>
                                  {("address" in r) && r.address && (
                                    <div className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-map-result-sub-${r.source}-${r.id}`}>
                                      {r.address}
                                    </div>
                                  )}
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px]" data-testid={`badge-map-result-type-${r.source}-${r.id}`}>
                                    {r.source === "place" ? "Place" : r.source === "client" ? "Client" : "Job"}
                                  </Badge>
                                  {r.source === "job" && r.status && (
                                    <Badge
                                      variant={r.status === "Active" ? "default" : "secondary"}
                                      className="text-[10px]"
                                      data-testid={`badge-map-result-status-${r.id}`}
                                    >
                                      {r.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <MapContainer center={centerPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {selected && <FlyTo lat={selected.lat} lon={selected.lon} zoom={14} />}

          {mapJobs.map((job) => (
            <Marker key={job.id} position={[job.latitude!, job.longitude!]}
              eventHandlers={{
                click: () => setSelected({ lat: job.latitude!, lon: job.longitude!, label: job.title })
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 min-w-[200px]">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm">{job.title}</h3>
                    <Badge variant={job.status === "Active" ? "default" : "secondary"} className="text-[10px] h-5">
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{job.locationAddress}</p>
                  <p className="text-xs">Start: {new Date(job.startAt).toLocaleDateString()}</p>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-xs text-primary underline block pt-2"
                    data-testid={`link-job-from-map-${job.id}`}
                  >
                    View Details
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 right-4 z-[400] bg-background/90 backdrop-blur p-3 rounded-lg border border-border shadow-lg text-sm">
          <h4 className="font-bold mb-2">Map Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Active Jobs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              <span>Planned Jobs</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
