import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Download, FolderOpen } from "lucide-react";
import type { PortalDocument } from "@/lib/portalProjections";
import { DOCUMENT_CATEGORY_LABELS, type ClientDocumentCategory } from "@/lib/portalDocuments";

type CategoryFilter = "all" | ClientDocumentCategory;
type SortKey = "shared-desc" | "shared-asc" | "title";

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "report", label: DOCUMENT_CATEGORY_LABELS.report },
  { key: "drawing", label: DOCUMENT_CATEGORY_LABELS.drawing },
  { key: "certificate", label: DOCUMENT_CATEGORY_LABELS.certificate },
  { key: "photo", label: DOCUMENT_CATEGORY_LABELS.photo },
  { key: "other", label: DOCUMENT_CATEGORY_LABELS.other },
];

interface PortalDocumentsPageProps {
  documents: PortalDocument[];
  projectTitleById: Record<string, string>;
  onViewDocument: (doc: PortalDocument) => void;
}

export function PortalDocumentsPage({ documents, projectTitleById, onViewDocument }: PortalDocumentsPageProps) {
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("shared-desc");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = documents
      .filter((d) => (filter === "all" ? true : d.category === filter))
      .filter((d) =>
        term
          ? d.title.toLowerCase().includes(term) ||
            d.description.toLowerCase().includes(term) ||
            (projectTitleById[d.projectId] ?? "").toLowerCase().includes(term)
          : true
      );

    return [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "shared-asc") return a.sharedAt < b.sharedAt ? -1 : 1;
      return a.sharedAt < b.sharedAt ? 1 : -1;
    });
  }, [documents, filter, search, sort, projectTitleById]);

  return (
    <div className="space-y-6" data-testid="portal-documents">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Documents</h1>
        <p className="text-slate-500 mt-1">Reports, drawings and certificates shared with you.</p>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
              data-testid="portal-documents-search"
            />
          </div>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            data-testid="portal-documents-sort"
          >
            <option value="shared-desc">Newest first</option>
            <option value="shared-asc">Oldest first</option>
            <option value="title">Name (A–Z)</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2" data-testid="portal-documents-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-full border transition ${
                filter === f.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              data-testid={`portal-documents-filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white" data-testid="portal-documents-empty">
          <FolderOpen className="h-8 w-8 mx-auto text-slate-400 mb-3" />
          <h3 className="text-lg font-medium text-slate-800">No documents found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
            Documents appear here once your project team shares them with you.
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="portal-documents-list">
          {visible.map((doc) => (
            <Card key={doc.id} className="border-slate-200" data-testid={`portal-document-${doc.id}`}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate">{doc.title}</span>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]" data-testid={`portal-document-category-${doc.id}`}>
                      {DOCUMENT_CATEGORY_LABELS[doc.category]}
                    </Badge>
                    <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 text-[10px] font-mono">
                      {doc.fileType}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.description}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400">
                    <span data-testid={`portal-document-project-${doc.id}`}>
                      {projectTitleById[doc.projectId] ?? "Project"}
                    </span>
                    <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    <span data-testid={`portal-document-shared-${doc.id}`}>
                      Shared {new Date(doc.sharedAt).toLocaleDateString()}
                    </span>
                    <span data-testid={`portal-document-sharedby-${doc.id}`}>by {doc.sharedBy}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start sm:self-auto"
                  onClick={() => onViewDocument(doc)}
                  data-testid={`portal-document-view-${doc.id}`}
                >
                  <Download className="h-4 w-4 mr-2" /> View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
