import { ArrowLeft, Printer } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { QRCodeBlock, buildBlindQrValue } from "@/components/common/QRCodeBlock";
import { PrintStyles } from "@/components/print/PrintStyles";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getCorporateIdentity } from "@/lib/corporateIdentity";
import { buildPrintFileName, printWithMode } from "@/lib/printExport";

function statusColor(status: string, accentColor: string) {
  if (status === "Completed") return "#059669";
  if (status === "Pending Approval") return "#f59e0b";
  if (status === "In Progress") return accentColor;
  return "#0f172a";
}

export default function SingleTagPrint() {
  const [location, setLocation] = useLocation();
  const id = decodeURIComponent(location.split("/blinds/")[1]?.split("/tag")[0] ?? "");
  const detailQuery = trpc.core.blindDetail.useQuery({ id }, { enabled: Boolean(id), staleTime: 10_000 });
  const blind = detailQuery.data;
  const settingsQuery = trpc.core.systemSettings.useQuery(undefined, { staleTime: 20_000 });
  const systemTags = settingsQuery.data?.tags;
  const general = settingsQuery.data?.general;
  const corporate = getCorporateIdentity(general as any);
  const settings = systemTags ? {
    templateName: "Global System Tag Template",
    tagWidthCm: systemTags.defaultTagWidthCm,
    tagHeightCm: systemTags.defaultTagHeightCm,
    tagColor: systemTags.defaultTagColor,
    accentColor: systemTags.defaultAccentColor,
    textColor: systemTags.defaultTextColor,
    logoText: corporate.showOnTags ? corporate.companyShortName : (general?.logoText ?? "SBTS"),
    logoImage: corporate.showOnTags ? corporate.companyLogo : "",
    showLogo: true,
    showHole: (systemTags as any).showHole ?? true,
    showStatus: false,
    showProjectNo: systemTags.showProjectNo,
    showLocationNote: false,
    qrSizePx: systemTags.defaultQrSizePx,
    fontScale: (systemTags as any).fontScale ?? 100,
  } : null;
  const recordTagPrint = trpc.core.recordTagPrint.useMutation({ onError: error => toast.error(error.message) });
  function printTag() {
    if (blind) recordTagPrint.mutate({ blindId: blind.id, projectId: blind.projectId, scope: "Blind", tagCount: 1 });
    printWithMode("tag", buildPrintFileName("SBTS_TAG", blind.tagNo));
  }

  if (detailQuery.isLoading || settingsQuery.isLoading) return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Preparing tag...</div>;
  if (!blind || !settings) return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Blind not found.</div>;

  return (
    <div className="space-y-6">
      <PrintStyles />
      <div className="no-print">
        <PageHeader
          eyebrow="Single QR Tag"
          title={`${blind.tagNo} · Printable Tag`}
          description={`Global template: ${settings.templateName}. QR code is linked to this blind detail page.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setLocation(`/blinds/${blind.id}`)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm"><ArrowLeft className="h-4 w-4" /> Blind Details</button>
              <button onClick={printTag} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg"><Printer className="h-4 w-4" /> Print Tag</button>
            </div>
          }
        />
      </div>
      <section className="flex justify-center">
        <article
          className="tag-card relative overflow-hidden rounded-[0.45cm] border-2 border-slate-900 p-4 shadow-lg"
          style={{ width: `${settings.tagWidthCm}cm`, height: `${settings.tagHeightCm}cm`, background: settings.tagColor, color: settings.textColor, fontSize: `${settings.fontScale}%` }}
        >
          {settings.showHole && <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border-2 bg-white" style={{ width: (systemTags as any)?.holeSizePx ?? 20, height: (systemTags as any)?.holeSizePx ?? 20, borderColor: settings.textColor }} />}
          <div className="flex h-full gap-4 pt-5">
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                {settings.showLogo && <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: settings.accentColor }}>{settings.logoImage ? <img src={settings.logoImage} alt="Company logo" className="h-8 w-8 rounded-lg bg-white p-1 object-contain" /> : null}{settings.logoText}</div>}
                <div className="mt-1 text-3xl font-black tracking-tight">{blind.tagNo}</div>
                <div className="mt-1 text-sm font-black opacity-70">{blind.blindNo} · {blind.blindType}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-black">
                <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Area</span>{blind.areaCode}</div>
                <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Line</span>{blind.lineNo}</div>
                <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Size</span>{blind.size}</div>
                <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Rating</span>{blind.rating ?? "N/A"}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
{settings.showProjectNo && <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{blind.projectNo ?? blind.projectName}</span>}
                {settings.showLocationNote && <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{blind.locationNote ?? ""}</span>}
              </div>
            </div>
            <div className="flex w-[4.1cm] flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-2">
              <QRCodeBlock value={buildBlindQrValue(blind.id, blind.tagNo)} label={blind.tagNo} size={Math.min(settings.qrSizePx, 150)} />
              <div className="text-center text-[9px] font-black uppercase tracking-wider opacity-60">Scan for live status</div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
