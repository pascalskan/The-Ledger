import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Download, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectDocuments({ documents }: { documents: any[] }) {
  if (!documents || documents.length === 0) return null;
  
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" /> Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-slate-100">
          {documents.map((doc, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <FileIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">{doc.name}</p>
                  <p className="text-xs text-slate-500">Uploaded {doc.date}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-800 shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
