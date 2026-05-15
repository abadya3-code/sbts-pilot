import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, Palette, RotateCcw, Save, Tags } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { QRCodeBlock, buildBlindQrValue } from "@/components/common/QRCodeBlock";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type TagSettingsForm = {
  scopeType: "Global" | "Project";
  projectId?: string | null;
  templateName: string;
  tagWidthCm: number;
  tagHeightCm: number;
  tagColor: string;
  accentColor: string;
  textColor: string;
  logoText: string;
  showLogo: boolean;
  showHole: boolean;
  showStatus: boolean;
  showProjectNo: boolean;
  showLocationNote: boolean;
  qrSizePx: number;
  fontScale: number;
  layoutMode: "Operational Split" | "Compact Field" | "Large QR";
};

const fallbackSettings: TagSettingsForm = {
  scopeType: "Project",
  projectId: null,
  templateName: "SBTS Standard Site Tag",
  tagWidthCm: 11,
  tagHeightCm: 7,
  tagColor: "#ffffff",
  accentColor: "#0891b2",
  textColor: "#0f172a",
  logoText: "Smart Blind Tag System",
  showLogo: true,
  showHole: true,
  showStatus: true,
  showProjectNo: true,
  showLocationNote: false,
  qrSizePx: 132,
  fontScale: 100,
  layoutMode: "Operational Split",
};

export default function TagDesignerSettings() {
  const [, params] = useRoute("/projects/:id/tag-settings");
  const [, setLocation] = useLocation();
  const projectId = params?.id ?? "";
  const utils = trpc.useUtils();
  const projectsQuery = trpc.core.projects.useQuery(undefined, { staleTime: 20_000 });
  const blindsQuery = trpc.core.blinds.useQuery(undefined, { staleTime: 20_000 });
  const settingsQuery = trpc.core.tagSettings.useQuery({ projectId }, { enabled: Boolean(projectId), staleTime: 10_000 });
  const project = projectsQuery.data?.find(item => item.id === projectId);
  const sampleBlind = (blindsQuery.data ?? []).find(item => item.projectId === projectId);
  const [form, setForm] = useState<TagSettingsForm>({ ...fallbackSettings, projectId });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm({
      scopeType: "Project",
      projectId,
      templateName: settingsQuery.data.templateName,
      tagWidthCm: settingsQuery.data.tagWidthCm,
      tagHeightCm: settingsQuery.data.tagHeightCm,
      tagColor: settingsQuery.data.tagColor,
      accentColor: settingsQuery.data.accentColor,
      textColor: settingsQuery.data.textColor,
      logoText: settingsQuery.data.logoText,
      showLogo: settingsQuery.data.showLogo,
      showHole: settingsQuery.data.showHole,
      showStatus: settingsQuery.data.showStatus,
      showProjectNo: settingsQuery.data.showProjectNo,
      showLocationNote: settingsQuery.data.showLocationNote,
      qrSizePx: settingsQuery.data.qrSizePx,
      fontScale: settingsQuery.data.fontScale,
      layoutMode: settingsQuery.data.layoutMode,
    });
  }, [settingsQuery.data, projectId]);

  const saveMutation = trpc.core.saveTagSettings.useMutation({
    onSuccess: async () => {
      toast.success("Tag designer settings saved.");
      await utils.core.tagSettings.invalidate({ projectId });
    },
    onError: error => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate({ ...form, scopeType: "Project", projectId });
  }

  function resetStandard() {
    setForm({ ...fallbackSettings, scopeType: "Project", projectId });
    toast.message("Standard 11 × 7 cm template restored locally. Click Save to persist.");
  }

  const previewBlind = sampleBlind ?? {
    id: "preview",
    tagNo: "SB-0001",
    blindNo: "BL-0001",
    blindType: "Slip Blind",
    areaCode: project?.areaCode ?? "AREA",
    lineNo: "D-111",
    size: "10 in",
    rating: "300#",
    status: "In Progress",
    projectNo: project?.projectNo ?? "PRJ",
    locationNote: "Preview location note",
  };

  if (projectsQuery.isLoading || settingsQuery.isLoading) {
    return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Loading tag designer...</div>;
  }
  if (!project) return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Project not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sprint 6 / Tag Designer Settings"
        title={`${project.projectNo} · Tag Designer`}
        description="Project-level template for QR hanging tags. Settings are persisted and used by single and batch tag printing."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLocation(`/projects/${project.id}`)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm"><ArrowLeft className="h-4 w-4" /> Project</button>
            <button onClick={() => setLocation(`/projects/${project.id}/tags`)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg"><Tags className="h-4 w-4" /> Open Tags</button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
        <form onSubmit={submit} className="sbts-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <Palette className="h-5 w-5 text-cyan-700" />
            <div>
              <h2 className="text-lg font-black text-slate-950">Template Controls</h2>
              <p className="text-sm font-semibold text-slate-500">Set colors, print size, QR size, logo text, and visible fields.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-bold text-slate-700">Template Name<input value={form.templateName} onChange={e => setForm({ ...form, templateName: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Logo Text<input value={form.logoText} onChange={e => setForm({ ...form, logoText: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Tag Width cm<input type="number" min={5} max={30} value={form.tagWidthCm} onChange={e => setForm({ ...form, tagWidthCm: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Tag Height cm<input type="number" min={4} max={30} value={form.tagHeightCm} onChange={e => setForm({ ...form, tagHeightCm: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Tag Color<input type="color" value={form.tagColor} onChange={e => setForm({ ...form, tagColor: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Accent Color<input type="color" value={form.accentColor} onChange={e => setForm({ ...form, accentColor: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Text Color<input type="color" value={form.textColor} onChange={e => setForm({ ...form, textColor: e.target.value })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">QR Size px<input type="number" min={72} max={260} value={form.qrSizePx} onChange={e => setForm({ ...form, qrSizePx: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Font Scale %<input type="number" min={80} max={140} value={form.fontScale} onChange={e => setForm({ ...form, fontScale: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-cyan-400" /></label>
            <label className="space-y-1 text-sm font-bold text-slate-700">Layout Mode<select value={form.layoutMode} onChange={e => setForm({ ...form, layoutMode: e.target.value as TagSettingsForm["layoutMode"] })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-cyan-400"><option>Operational Split</option><option>Compact Field</option><option>Large QR</option></select></label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["showLogo", "Show logo/header"],
              ["showHole", "Show center hanging hole"],
              ["showStatus", "Show status pill"],
              ["showProjectNo", "Show project number"],
              ["showLocationNote", "Show location note"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                {label}
                <input type="checkbox" checked={Boolean(form[key as keyof TagSettingsForm])} onChange={e => setForm({ ...form, [key]: e.target.checked })} className="h-5 w-5 accent-cyan-600" />
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={resetStandard} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-600"><RotateCcw className="h-4 w-4" /> Standard</button>
            <button disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"><Save className="h-4 w-4" /> Save Template</button>
          </div>
        </form>

        <section className="sbts-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950"><Eye className="h-4 w-4 text-cyan-700" /> Live Preview</div>
          <div className="flex justify-center overflow-auto rounded-3xl bg-slate-100 p-5">
            <article
              className="relative overflow-hidden rounded-[0.45cm] border-2 border-slate-900 p-4 shadow-lg"
              style={{ width: `${form.tagWidthCm}cm`, height: `${form.tagHeightCm}cm`, background: form.tagColor, color: form.textColor, fontSize: `${form.fontScale}%` }}
            >
              {form.showHole && <div className="absolute left-1/2 top-2 h-5 w-5 -translate-x-1/2 rounded-full border-2 bg-white" style={{ borderColor: form.textColor }} />}
              <div className="flex h-full gap-4 pt-5">
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    {form.showLogo && <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: form.accentColor }}>{form.logoText}</div>}
                    <div className="mt-1 text-3xl font-black tracking-tight">{previewBlind.tagNo}</div>
                    <div className="mt-1 text-sm font-black opacity-70">{previewBlind.blindNo} · {previewBlind.blindType}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-black">
                    <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Area</span>{previewBlind.areaCode}</div>
                    <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Line</span>{previewBlind.lineNo}</div>
                    <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Size</span>{previewBlind.size}</div>
                    <div className="rounded-xl bg-white/70 p-2"><span className="block text-[9px] uppercase tracking-wider opacity-60">Rating</span>{previewBlind.rating ?? "N/A"}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {form.showStatus && <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white" style={{ background: form.accentColor }}>{previewBlind.status}</span>}
                    {form.showProjectNo && <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{previewBlind.projectNo}</span>}
                    {form.showLocationNote && <span className="text-[10px] font-black uppercase tracking-wider opacity-60">{previewBlind.locationNote}</span>}
                  </div>
                </div>
                <div className="flex w-[4.1cm] flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-2">
                  <QRCodeBlock value={buildBlindQrValue(previewBlind.id, previewBlind.tagNo)} label={previewBlind.tagNo} size={Math.min(form.qrSizePx, 150)} />
                  <div className="text-center text-[9px] font-black uppercase tracking-wider opacity-60">Scan for live status</div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
