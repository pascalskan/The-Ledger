import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { WeeklyIntelligenceStrip } from "@/components/schedule/WeeklyIntelligenceStrip";
import { JobScheduleCard } from "@/components/schedule/JobScheduleCard";
import { SmartFilters } from "@/components/schedule/SmartFilters";
import { OperationalDrawer } from "@/components/schedule/OperationalDrawer";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Job } from "@/types/job";

type DayRollup = Date;

type OperationalJob = Job & {
  clientName: string;
  contractValue: number;
  costToDate: number;
  invoicedPct: number;
  scheduledHours: number;
  remainingLaborHours: number;
  crewCount: number;
  equipmentCount: number;
  forecastMarginPct: number;
  marginStatus: "Green" | "Yellow" | "Red";
  hasConflict: boolean;
};

export default function SchedulePage() {
  const { jobs, clients } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    margin: "all",
    crew: "all",
    client: "all",
  });

  // Drawer state
  type SelectedItem =
    | OperationalJob
    | {
        dateStr: string;
        totalScheduledRevenue: number;
        totalEstimatedLaborCost: number;
        netContribution: number;
        crewAllocationPct: number;
        equipmentAllocationPct: number;
      }
    | null;

  const [selectedItem, setSelectedItem] =
    useState<SelectedItem>(null);

  const [drawerType, setDrawerType] =
    useState<"job" | "day" | null>(null);

  // Navigation
  const next = () => setCurrentDate((d) => addDays(d, 7));
  const prev = () => setCurrentDate((d) => addDays(d, -7));
  const today = () => setCurrentDate(new Date());

  // Week Grid Setup
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    addDays(weekStart, i)
  );

  // -------------------------------------------------------------
  // FORECAST LOGIC MOCKUP
  // In a real app, this would use data fetched from QB API + System Scheduled Hours
  // -------------------------------------------------------------

  const generateMockOperationalData = (
  job: Job
  ): OperationalJob => {
    // Generate deterministic but realistic-looking financial data for the mock
    const seed = job.title.length * 1000;
    const contractValue = 10000 + seed + job.id.charCodeAt(0) * 500;
    const costToDate = contractValue * 0.4;
    const remainingLaborHours = 40 + (seed % 100);
    const scheduledHoursToday = 8 + (seed % 8);
    const crewCount = job.assignedWorkerIds?.length || 2;
    const eqCount = job.assignedEquipmentIds?.length || 0;

    // Margin calculation
    const estRemainingCost = remainingLaborHours * 35;
    const totalEstCost = costToDate + estRemainingCost;

    const forecastMarginPct = Math.round(
      ((contractValue - totalEstCost) / contractValue) * 100
    );

    let marginStatus: "Green" | "Yellow" | "Red" = "Green";

    return {
      ...job,
      clientName:
        clients.find((c) => c.id === job.clientId)?.name ||
        "Unknown Client",
      contractValue,
      costToDate,
      invoicedPct: Math.min(
        100,
        Math.round((costToDate / contractValue) * 110)
      ),
      scheduledHours: scheduledHoursToday,
      remainingLaborHours,
      crewCount,
      equipmentCount: eqCount,
      forecastMarginPct,
      marginStatus,
      hasConflict: seed % 7 === 0,
    };
  };

  const operationalJobs = useMemo(() => {
    return jobs
      .map(generateMockOperationalData)
      .filter((job) => {
        // Apply Smart Filters
        if (filters.margin === "risk" && job.marginStatus === "Green") {
          return false;
        }

        if (
          filters.margin === "healthy" &&
          job.marginStatus !== "Green"
        ) {
          return false;
        }

        if (
          filters.client !== "all" &&
          job.clientId !== filters.client
        ) {
          return false;
        }

        return true;
      });
  }, [jobs, clients, filters]);

  const getJobsForDay = (date: Date) => {
    return operationalJobs.filter((job) => {
      const start = new Date(job.createdAt);
      const end = new Date(job.updatedAt);

      return (
        isSameDay(start, date) ||
        (start <= date && end >= date)
      );
    });
  };

  // Mock Weekly Metrics
  const weeklyMetrics = {
    workforceUtil: 82,
    equipmentUtil: 64,
    scheduledRevenue: 42500,
    forecastedLaborCost: 12400,
    netForecastContribution: 30100,
    overtimeRisk: true,
  };

  // Drawer Handlers
  const handleJobClick = (
    job: OperationalJob
  ) => {
    setSelectedItem(job);
    setDrawerType("job");
  };

  const handleDayClick = (
    day: DayRollup,
    dayJobs: OperationalJob[]
  ) => {
    // Generate daily rollup stats
    const rev = dayJobs.reduce(
      (sum: number, j: OperationalJob) =>
        sum + j.contractValue * 0.05,
      0
    );

    const labor = dayJobs.reduce(
      (sum: number, j: OperationalJob) =>
        sum + j.scheduledHours * 35,
      0
    );

    setSelectedItem({
      dateStr: format(day, "EEEE, MMMM do"),
      totalScheduledRevenue: rev,
      totalEstimatedLaborCost: labor,
      netContribution: rev - labor,
      crewAllocationPct: Math.round(75 + dayJobs.length * 2),
      equipmentAllocationPct: Math.round(40 + dayJobs.length * 5),
    });

    setDrawerType("day");
  };
  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pr-4 pl-1 pb-4">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 shrink-0">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Operational Schedule
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Profit-aware planning & resource control.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <SmartFilters
                filters={filters}
                setFilters={setFilters}
              />

              <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={prev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="w-32 text-center text-sm font-medium text-slate-700">
                  {format(weekStart, "MMM d")} -{" "}
                  {format(addDays(weekStart, 6), "MMM d")}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={next}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="bg-white border-slate-200 text-slate-600 shadow-sm"
                onClick={today}
              >
                Today
              </Button>
            </div>
          </div>

          {/* Intelligence Strip */}
          <WeeklyIntelligenceStrip metrics={weeklyMetrics} />

          {/* Calendar Grid */}
          <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 shrink-0">
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  onClick={() => handleDayClick(d, getJobsForDay(d))}
                  className="p-3 text-center border-r border-slate-200 last:border-r-0 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                    {format(d, "EEE")}
                  </div>

                  <div
                    className={`text-lg font-bold leading-none ${
                      isSameDay(d, new Date())
                        ? "text-blue-600"
                        : "text-slate-800"
                    }`}
                  >
                    {format(d, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto">
              {weekDays.map((day, i) => {
                const dayJobs = getJobsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={i}
                    className={`border-r border-slate-100 last:border-r-0 p-2 space-y-2 min-h-[300px] ${
                      isToday ? "bg-blue-50/20" : ""
                    }`}
                  >
                    {dayJobs.map((job) => (
                      <JobScheduleCard
                        key={job.id}
                        job={job}
                        onClick={() => handleJobClick(job)}
                        isSelected={
                          typeof selectedItem === "object" &&
                          selectedItem !== null &&
                          "id" in selectedItem &&
                          selectedItem.id === job.id
                        }
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Drawer */}
        {drawerType === "day" && (
          <div className="shrink-0 h-full animate-in slide-in-from-right duration-300">
            <OperationalDrawer
              selectedItem={selectedItem as {
                dateStr: string;
                totalScheduledRevenue: number;
                totalEstimatedLaborCost: number;
                netContribution: number;
                crewAllocationPct: number;
                equipmentAllocationPct: number;
              }}
              onClose={() => setDrawerType(null)}
              type="day"
            />
          </div>
        )}

        {drawerType === "day" && (
          <div className="shrink-0 h-full animate-in slide-in-from-right duration-300">
            <OperationalDrawer
              selectedItem={selectedItem as {
                dateStr: string;
                totalScheduledRevenue: number;
                totalEstimatedLaborCost: number;
                netContribution: number;
                crewAllocationPct: number;
                equipmentAllocationPct: number;
              }}
              onClose={() => setDrawerType(null)}
              type="day"
            />
          </div>
        )}
      </div>
    </Layout>
  );
}