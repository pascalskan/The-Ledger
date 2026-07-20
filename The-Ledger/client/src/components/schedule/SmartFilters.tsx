import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

interface SmartFiltersState {
  margin: string;
  crew: string;
  client: string;
}

interface SmartFiltersProps {
  filters: SmartFiltersState;
  setFilters: (filters: SmartFiltersState) => void;
}

export function SmartFilters({ filters, setFilters }: SmartFiltersProps) {
  return (
    <div className="flex items-center gap-2 bg-card p-1 rounded-md border border-border shadow-sm">
      <div className="flex items-center pl-2 pr-1 text-muted-foreground">
        <Filter className="h-4 w-4" />
      </div>
      
      <Select value={filters.margin} onValueChange={(v) => setFilters({...filters, margin: v})}>
        <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-medium w-[130px] focus:ring-0">
          <SelectValue placeholder="Margin Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Margins</SelectItem>
          <SelectItem value="healthy">Healthy Only</SelectItem>
          <SelectItem value="risk">At Risk (Red/Yellow)</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-4 bg-slate-200 mx-1"></div>

      <Select value={filters.client} onValueChange={(v) => setFilters({...filters, client: v})}>
        <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-medium w-[120px] focus:ring-0">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {/* We would map clients here in real app */}
          <SelectItem value="c1">HSS Limited</SelectItem>
          <SelectItem value="c2">Acme Corp</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}