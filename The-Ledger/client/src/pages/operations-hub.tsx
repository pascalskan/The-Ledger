/**
 * OPERATIONS HUB — UX-8
 *
 * The last unconsolidated area of the platform. Finance (UX-4), Intelligence
 * (UX-5), Automation (UX-6) and Review (UX-7) were each consolidated into a
 * hub; Operations was never started, leaving 10 separate operational
 * destinations in the CEO sidebar — the exact fragmentation the UX programme
 * opens by describing.
 *
 * COMPOSITION
 * Each tab renders an existing page component unchanged. Those pages render
 * their own <Layout>, which is idempotent (see components/layout.tsx): a
 * nested Layout renders only its children, so the outer shell still owns the
 * sidebar, header, mobile tab bar and the single <main> landmark.
 *
 * This was chosen over refactoring six pages (~2,460 lines, several with
 * role-branched dual Layout blocks) to split shell from content. That refactor
 * would have been a large, risky change against a 966-test suite for no
 * user-visible difference.
 *
 * HEADINGS
 * The hub deliberately renders NO PageHeader of its own. Each composed page
 * already renders exactly one <h1> (guaranteed by E-4), so letting the active
 * tab supply the heading keeps one h1 per view. A hub-level header would make
 * two.
 *
 * ROUTES
 * The standalone routes (/jobs, /schedule, ...) are deliberately retained and
 * NOT redirected. They are deep-link targets from dashboards, review items and
 * notifications throughout the app, and are exercised directly by a large
 * number of tests. The hub is an additional way in, not a replacement.
 */

import { useEffect } from "react";
import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Calendar, Users, Building2, Map as MapIcon, Package } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { useStore, useAuth } from "@/lib/mockData";
import { isCEO, isProjectManager } from "@/lib/roleHelpers";
import UnauthorizedPage from "@/pages/unauthorized";

import JobsPage from "@/pages/jobs";
import SchedulePage from "@/pages/schedule";
import WorkersPage from "@/pages/workers";
import ClientsPage from "@/pages/clients";
import MapPage from "@/pages/map";
import EquipmentPage from "@/pages/equipment";

const TABS = [
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "workers", label: "Workers", icon: Users },
  { key: "clients", label: "Clients", icon: Building2 },
  { key: "map", label: "Map", icon: MapIcon },
  { key: "stock", label: "Stock & Assets", icon: Package },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OperationsHubPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const raw = params.get("tab") ?? "jobs";
  const activeTab: TabKey = (TABS.some((t) => t.key === raw) ? raw : "jobs") as TabKey;

  const { user } = useAuth();
  const { roles } = useStore();

  // Operations is CEO + PM. Each composed page applies its own role scoping
  // internally (a PM sees My Jobs / Crew, a CEO sees all), so the hub only
  // gates entry — it never widens what a role can see.
  const allowed = isCEO(user, roles) || isProjectManager(user, roles);

  useEffect(() => {
    // Normalise an unknown ?tab= so the URL always reflects what is rendered.
    if (raw !== activeTab) setLocation(`/operations?tab=${activeTab}`, { replace: true } as never);
  }, [raw, activeTab, setLocation]);

  if (!allowed) return <UnauthorizedPage />;

  function handleTabChange(tab: string) {
    setLocation(`/operations?tab=${tab}`);
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="operations-hub-page">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex h-auto flex-wrap gap-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="flex items-center gap-1.5"
                data-testid={`operations-tab-${t.key}`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Only the active tab's page is mounted. Radix unmounts inactive
              TabsContent by default, so switching tabs does not keep six data
              -heavy pages alive at once. */}
          <TabsContent value="jobs" data-testid="operations-jobs-panel">
            <JobsPage />
          </TabsContent>
          <TabsContent value="schedule" data-testid="operations-schedule-panel">
            <SchedulePage />
          </TabsContent>
          <TabsContent value="workers" data-testid="operations-workers-panel">
            <WorkersPage />
          </TabsContent>
          <TabsContent value="clients" data-testid="operations-clients-panel">
            <ClientsPage />
          </TabsContent>
          <TabsContent value="map" data-testid="operations-map-panel">
            <MapPage />
          </TabsContent>
          <TabsContent value="stock" data-testid="operations-stock-panel">
            <EquipmentPage />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
