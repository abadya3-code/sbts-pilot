import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, Grip, Palette, RotateCcw, Save, Tags } from "lucide-react";
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
  const [selectedLayer, setSelectedLayer] = useState<"title" | "qr" | "logo" | "hole" | "data">("qr");
  const [layout, setLayout] = useState({ title: { x: 18, y: 18 }, logo: { x: 76, y: 10 }, hole: { x: 50, y: 9 }, qr: { x: 50, y: 50 }, data: { x: 50, y: 82 } });

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
        eyebrow="Tag Designer Pro"
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
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950"><Eye className="h-4 w-4 text-cyan-700" /> Live Tag Layout Editor</div>
            <div className="text-xs font-bold text-slate-500">Use the layer controls to position the tag elements before print/PDF export.</div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_270px]">
            <div className="flex justify-center overflow-auto rounded-3xl bg-slate-100 p-5">
              <article
                className="relative overflow-hidden rounded-[0.45cm] border-2 border-slate-900 shadow-lg"
                style={{ width: `${form.tagWidthCm}cm`, height: `${form.tagHeightCm}cm`, background: form.tagColor, color: form.textColor, fontSize: `${form.fontScale}%` }}
              >
                {form.showHole && <button type="button" onClick={() => setSelectedLayer("hole")} className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[6px] bg-white/80 shadow" style={{ left: `${layout.hole.x}%`, top: `${layout.hole.y}%`, borderColor: form.textColor }} aria-label="Select hanging hole" />}
                {form.showLogo && <button type="button" onClick={() => setSelectedLayer("logo")} className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl bg-white/90 p-1 text-xs font-black shadow ring-2 ring-white" style={{ left: `${layout.logo.x}%`, top: `${layout.logo.y}%`, color: form.accentColor }}>LOGO</button>}
                <button type="button" onClick={() => setSelectedLayer("title")} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl px-2 py-1 text-center text-2xl font-black tracking-tight ring-2 ring-transparent hover:ring-cyan-200" style={{ left: `${layout.title.x}%`, top: `${layout.title.y}%` }}>{form.logoText}</button>
                <button type="button" onClick={() => setSelectedLayer("qr")} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-2 shadow-xl ring-2 ring-white hover:ring-cyan-300" style={{ left: `${layout.qr.x}%`, top: `${layout.qr.y}%` }}>
                  <QRCodeBlock value={buildBlindQrValue(previewBlind.id, previewBlind.tagNo)} label={previewBlind.tagNo} size={Math.min(form.qrSizePx, 210)} />
                </button>
                <button type="button" onClick={() => setSelectedLayer("data")} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl px-3 py-2 text-center font-black ring-2 ring-transparent hover:ring-cyan-200" style={{ left: `${layout.data.x}%`, top: `${layout.data.y}%` }}>
                  <div>ID: {previewBlind.tagNo}</div>
                  <div>Area: {previewBlind.areaCode}</div>
                  <div>Line: {previewBlind.lineNo}</div>
                  <div className="mt-1 text-xs opacity-70">{previewBlind.size} · {previewBlind.rating ?? "N/A"}</div>
                </button>
                {form.showProjectNo && <div className="absolute bottom-2 left-3 text-[10px] font-black uppercase tracking-wider opacity-70">{previewBlind.projectNo}</div>}
              </article>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950"><Grip className="h-4 w-4 text-cyan-700" /> Layer Position</div>
              <div className="grid gap-2">
                {(["title", "logo", "hole", "qr", "data"] as const).map(layer => (
                  <button key={layer} type="button" onClick={() => setSelectedLayer(layer)} className={`rounded-2xl px-3 py-2 text-left text-xs font-black uppercase tracking-wider ${selectedLayer === layer ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"}`}>{layer}</button>
                ))}
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">X Position {layout[selectedLayer].x}%<input type="range" min="0" max="100" value={layout[selectedLayer].x} onChange={e => moveLayer(selectedLayer, "x", Number(e.target.value))} className="mt-2 w-full" /></label>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500">Y Position {layout[selectedLayer].y}%<input type="range" min="0" max="100" value={layout[selectedLayer].y} onChange={e => moveLayer(selectedLayer, "y", Number(e.target.value))} className="mt-2 w-full" /></label>
                <div className="rounded-2xl bg-cyan-50 p-3 text-xs font-bold leading-5 text-cyan-900">Layer controls prepare the professional editor behavior. Saved print settings continue to use existing project template fields; persisted per-layer coordinates can be added in a future schema migration when approved.</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
