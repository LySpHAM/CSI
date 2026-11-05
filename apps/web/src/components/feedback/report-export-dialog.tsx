"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  X,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExportJob = {
  id: string;
  status: string;
  ready: boolean;
  error_message: string | null;
  filename?: string | null;
};

type Format = "xlsx" | "pdf";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: Record<string, string>;
  surveyName: string;
  dateRange: string;
  scope: string;
};

const reportContents = [
  "Tổng quan số lượng phản hồi",
  "Thống kê trạng thái phản hồi",
  "Biểu đồ sắc thái cảm xúc: tích cực, tiêu cực, trung lập",
  "Thống kê phản hồi theo chủ đề",
  "Thống kê câu trả lời theo câu hỏi",
  "Thống kê phản hồi theo kênh thu thập",
  "Các chỉ số hài lòng (nếu có dữ liệu)",
];

export function ReportExportDialog({
  open,
  onOpenChange,
  filters,
  surveyName,
  dateRange,
  scope,
}: Props) {
  const [format, setFormat] = useState<Format>("xlsx");
  const [jobId, setJobId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "pending">("form");
  const [requestError, setRequestError] = useState("");
  const report = useQuery({
    queryKey: ["export", jobId],
    enabled: open && !!jobId,
    queryFn: () => api<ExportJob>(`/exports/${jobId}`),
    refetchInterval: (query) =>
      ["done", "failed"].includes(query.state.data?.status || "") ? false : 2000,
  });
  const displayPhase =
    phase === "pending" && requestError
      ? "failed"
      : phase === "pending" && jobId && (report.data?.ready || report.data?.status === "done")
      ? "success"
      : phase === "pending" && jobId && (report.data?.status === "failed" || report.error)
        ? "failed"
        : phase;

  function reset() {
    setPhase("form");
    setJobId(null);
    setRequestError("");
    setFormat("xlsx");
  }

  function changeOpen(next: boolean) {
    if (!next && displayPhase === "pending") return;
    if (!next) reset();
    onOpenChange(next);
  }

  async function startExport() {
    setRequestError("");
    setPhase("pending");
    try {
      const created = await api<ExportJob>("/exports", {
        method: "POST",
        body: { kind: format, filters },
      });
      setJobId(created.id);
    } catch {
      setRequestError("Xuất báo cáo thất bại. Vui lòng thử lại.");
    }
  }

  async function downloadReport() {
    if (!jobId) return;
    try {
      const blob = await api<Blob>(`/exports/${jobId}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = report.data?.filename || `bao-cao-thong-ke.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setRequestError("Không tải được tệp báo cáo. Vui lòng thử lại.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        showCloseButton={displayPhase !== "pending"}
        className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-2xl"
        aria-describedby="report-export-description"
      >
        <DialogHeader className="border-b border-border/70 bg-muted/30 px-6 py-5 pr-14 text-left">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <BarChart3 className="size-5" aria-hidden />
            </span>
            <div>
              <DialogTitle className="text-lg tracking-tight">Xuất báo cáo thống kê</DialogTitle>
              <DialogDescription id="report-export-description" className="mt-1">
                Chọn định dạng và phạm vi dữ liệu để xuất báo cáo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(90vh-10rem)] space-y-5 overflow-y-auto px-6 py-5">
          {displayPhase === "form" && (
            <>
              <section aria-labelledby="report-info-title" className="space-y-3">
                <h3 id="report-info-title" className="text-sm font-semibold">Thông tin báo cáo</h3>
                <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
                  <Info label="Khảo sát" value={surveyName} icon={<MessageSquareText className="size-4" />} />
                  <Info label="Khoảng thời gian" value={dateRange} icon={<Clock3 className="size-4" />} />
                  <Info label="Thời gian tạo dự kiến" value={new Date().toLocaleString("vi-VN")} icon={<Clock3 className="size-4" />} />
                  <Info label="Phạm vi dữ liệu" value={scope} icon={<Filter className="size-4" />} />
                </div>
              </section>

              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold">Định dạng tệp</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormatCard
                    selected={format === "xlsx"}
                    onClick={() => setFormat("xlsx")}
                    icon={<FileSpreadsheet className="size-5" />}
                    title="Excel (.xlsx)"
                    description="Bảng thống kê tiện phân tích và xử lý tiếp."
                    color="text-emerald-600"
                  />
                  <FormatCard
                    selected={format === "pdf"}
                    onClick={() => setFormat("pdf")}
                    icon={<FileText className="size-5" />}
                    title="PDF (.pdf)"
                    description="Bố cục rõ ràng, phù hợp lưu trữ và chia sẻ."
                    color="text-rose-600"
                  />
                </div>
              </fieldset>

              <section aria-labelledby="report-content-title" className="space-y-3">
                <div>
                  <h3 id="report-content-title" className="text-sm font-semibold">Nội dung báo cáo</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Dựa trên dữ liệu và bộ lọc hiện tại.</p>
                </div>
                <ul className="grid gap-x-5 gap-y-2 rounded-xl border border-border/70 p-4 sm:grid-cols-2">
                  {reportContents.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {displayPhase === "pending" && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center" role="status" aria-live="polite">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <LoaderCircle className="size-7 animate-spin" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">Đang tạo báo cáo, vui lòng chờ...</p>
                <p className="mt-1 text-sm text-muted-foreground">Quá trình này có thể mất một chút thời gian.</p>
              </div>
            </div>
          )}

          {displayPhase === "success" && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center" role="status" aria-live="polite">
              <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="size-7" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">Xuất báo cáo thành công</p>
                <p className="mt-1 text-sm text-muted-foreground">{report.data?.filename || `bao-cao-thong-ke.${format}`}</p>
              </div>
              <Button onClick={() => void downloadReport()} className="gap-2 rounded-lg">
                <Download className="size-4" aria-hidden />Tải báo cáo
              </Button>
            </div>
          )}

          {displayPhase === "failed" && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center" role="alert">
              <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                <X className="size-7" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">{requestError || "Xuất báo cáo thất bại. Vui lòng thử lại."}</p>
                {report.data?.error_message && <p className="mt-1 text-sm text-muted-foreground">{report.data.error_message}</p>}
              </div>
              <Button variant="outline" onClick={() => { reset(); void startExport(); }} className="gap-2 rounded-lg">
                <RotateCcw className="size-4" aria-hidden />Thử lại
              </Button>
            </div>
          )}
        </div>

        {(displayPhase === "form" || displayPhase === "success" || displayPhase === "failed") && (
          <DialogFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
            {displayPhase === "form" ? (
              <>
                <Button variant="outline" onClick={() => changeOpen(false)} className="rounded-lg">Hủy</Button>
                <Button onClick={() => void startExport()} className="gap-2 rounded-lg">
                  <Download className="size-4" aria-hidden />Xuất báo cáo
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => changeOpen(false)} className="rounded-lg">Đóng</Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium" title={value}>{value}</p>
      </div>
    </div>
  );
}

function FormatCard({
  selected,
  onClick,
  icon,
  title,
  description,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/70 bg-background hover:border-primary/50"}`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg bg-muted ${color}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold">
          {title}
          <span className={`grid size-4 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
            {selected && <Check className="size-3" aria-hidden />}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
