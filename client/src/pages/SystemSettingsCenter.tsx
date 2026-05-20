import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Bell, Database, FileCheck2, ListChecks, LockKeyhole, RotateCcw, Save, Settings2, ShieldCheck, Tags } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { trpc } from "@/lib/trpc";
import { QRCodeBlock } from "@/components/common/QRCodeBlock";
import { getCorporateIdentity, initialsFromCompanyName } from "@/lib/corporateIdentity";
import { dispatchThemeChanged, THEME_OPTIONS, themeClassFor, themeDisplayName } from "@/lib/themeEngine";

type SettingsForm = {
  general: {
    systemName: string;
    facilityName: string;
    departmentName: string;
    defaultLanguage: "English" | "Arabic" | "Bilingual";
    dateFormat: "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
    timeFormat: "24H" | "12H";
    logoText: string;
    logoUrl?: string | null;
    appVersionNumber?: string | null;
    releaseName?: string | null;
    releaseYear?: string | null;
    appIconDataUrl?: string | null;
    companyName?: string | null;
    companyShortName?: string | null;
    companySubtitle?: string | null;
    companyLogoDataUrl?: string | null;
    showCompanyNameBesideLogo?: boolean;
    showCompanyOnCertificates?: boolean;
    showCompanyOnTags?: boolean;
    showCompanyOnReports?: boolean;
    appDescription?: string | null;
    dashboardHeroTitle?: string | null;
    dashboardHeroDescription?: string | null;
    themeTemplate?: "Template 1" | "Template 2 Classic" | "Template 3 SAP" | "Template 4 Custom" | "Template 5 Command Pro";
    customAccentColor?: string;
  };
  tags: {
    defaultTagWidthCm: number;
    defaultTagHeightCm: number;
    defaultTagColor: string;
    defaultAccentColor: string;
    defaultTextColor: string;
    defaultQrSizePx: number;
    showArea: boolean;
    showLine: boolean;
    showSize: boolean;
    showRating: boolean;
    showProjectNo: boolean;
    showBlindType: boolean;
    companyLogoUrl?: string | null;
    showHole?: boolean;
    fontScale?: number;
    holeSizePx?: number;
  };
  certificates: {
    certificateTitle: string;
    certificateNoFormat: string;
    requireFinalApprovalBeforeIssue: boolean;
    showTorqueSection: boolean;
    showApprovalSection: boolean;
    showQrCode: boolean;
    showActivitySummary: boolean;
    showRevisionNumber: boolean;
    certificateLogoUrl?: string | null;
    fontScale?: number;
    layoutMode?: "Executive" | "Classic" | "Compact";
  };
  approvals?: { profiles: { blindType: string; requiredApprovers: string[]; requireAll: boolean; unlockCertificate: boolean }[] };
  masterData?: { blindTypes: string[] };
  notifications: {
    notifyOnNewBlind: boolean;
    notifyOnPhaseUpdate: boolean;
    notifyOnApprovalRequired: boolean;
    notifyOnCertificateIssued: boolean;
    notifyOnTagPrinted: boolean;
    notifyOnRejectedApproval: boolean;
  };
  security: {
    sessionTimeoutHours: number;
    requireLoginForQrActions: boolean;
    allowVisitorQrView: boolean;
    adminPagesHardLock: boolean;
    allowDeleteActions: boolean;
    requireDeleteConfirmation: boolean;
    enableAuditTrail: boolean;
  };
};

const defaultSettings: SettingsForm = {
  general: {
    systemName: "Smart Blind Tag System",
    facilityName: "Shedgum Gas Plant",
    departmentName: "Maintenance",
    defaultLanguage: "Bilingual",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "24H",
    logoText: "SBTS Professional",
    logoUrl: "",
    appVersionNumber: "V1.0",
    releaseName: "Pilot Live",
    releaseYear: "2026",
    appIconDataUrl: "",
    companyName: "Company Name",
    companyShortName: "Company",
    companySubtitle: "Shedgum Gas Plant / Maintenance Department",
    companyLogoDataUrl: "",
    showCompanyNameBesideLogo: true,
    showCompanyOnCertificates: true,
    showCompanyOnTags: true,
    showCompanyOnReports: true,
    appDescription: "Operational isolation governance platform",
    dashboardHeroTitle: "Digital blind isolation control built for field execution and management visibility.",
    dashboardHeroDescription: "SBTS connects projects, blinds, QR tags, phase updates, approvals, certificates, notifications, and audit history in one maintainable React command center.",
    themeTemplate: "Template 1",
    customAccentColor: "#0891b2",
  },
  tags: {
    defaultTagWidthCm: 11,
    defaultTagHeightCm: 7,
    defaultTagColor: "#ffffff",
    defaultAccentColor: "#0891b2",
    defaultTextColor: "#0f172a",
    defaultQrSizePx: 132,
    showArea: true,
    showLine: true,
    showSize: true,
    showRating: true,
    showProjectNo: true,
    showBlindType: true,
    companyLogoUrl: "",
    showHole: true,
    fontScale: 100,
    holeSizePx: 20,
  },
  certificates: {
    certificateTitle: "Blind Completion Certificate",
    certificateNoFormat: "SBTS-CERT-{PROJECT}-{BLIND}-R{REV}",
    requireFinalApprovalBeforeIssue: true,
    showTorqueSection: true,
    showApprovalSection: true,
    showQrCode: true,
    showActivitySummary: true,
    showRevisionNumber: true,
    certificateLogoUrl: "",
    fontScale: 100,
    layoutMode: "Executive",
  },
  approvals: { profiles: [
    { blindType: "Blind", requiredApprovers: ["Operation Foreman", "Project Engineer", "Inspection Unit"], requireAll: true, unlockCertificate: true },
    { blindType: "Slip Blind", requiredApprovers: ["Operation Foreman", "Project Engineer", "Inspection Unit", "Metal Foreman"], requireAll: true, unlockCertificate: true },
    { blindType: "Drop Spool", requiredApprovers: ["Operation Foreman", "Project Engineer", "Inspection Unit"], requireAll: true, unlockCertificate: true },
  ] },
  masterData: { blindTypes: ["Slip Blind", "Spectacle Blind", "Spacer", "Drop Spool", "Isolation Blind"] },
  notifications: {
    notifyOnNewBlind: true,
    notifyOnPhaseUpdate: true,
    notifyOnApprovalRequired: true,
    notifyOnCertificateIssued: true,
    notifyOnTagPrinted: true,
    notifyOnRejectedApproval: true,
  },
  security: {
    sessionTimeoutHours: 12,
    requireLoginForQrActions: true,
    allowVisitorQrView: true,
    adminPagesHardLock: true,
    allowDeleteActions: true,
    requireDeleteConfirmation: true,
    enableAuditTrail: true,
  },
};

const tabs = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "tags", label: "Tags", icon: Tags },
  { key: "certificates", label: "Certificates", icon: FileCheck2 },
  { key: "approvals", label: "Approval Profiles", icon: ListChecks },
  { key: "masterData", label: "Master Data", icon: ListChecks },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: LockKeyhole },
] as const;

type TabKey = (typeof tabs)[number]["key"];

type ToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-cyan-200 hover:shadow-md"
    >
      <span>
        <span className="block text-sm font-black text-slate-900">{label}</span>
        <span className="block text-xs font-semibold text-slate-500">{description}</span>
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-cyan-600" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-1 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>;
}

export default function SystemSettingsCenter() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.core.systemSettings.useQuery(undefined, { staleTime: 10_000 });
  const persistenceQuery = trpc.core.persistenceStatus.useQuery(undefined, { staleTime: 20_000 });
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [form, setForm] = useState<SettingsForm>(defaultSettings);

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm({
      general: { ...defaultSettings.general, ...settingsQuery.data.general },
      tags: { ...defaultSettings.tags, ...settingsQuery.data.tags },
      certificates: { ...defaultSettings.certificates, ...settingsQuery.data.certificates },
      approvals: { ...defaultSettings.approvals, ...(settingsQuery.data as any).approvals },
      masterData: { ...defaultSettings.masterData, ...(settingsQuery.data as any).masterData },
      notifications: { ...defaultSettings.notifications, ...settingsQuery.data.notifications },
      security: { ...defaultSettings.security, ...settingsQuery.data.security },
    });
  }, [settingsQuery.data]);

  const saveMutation = trpc.core.saveSystemSettings.useMutation({
    onSuccess: async () => {
      toast.success("System settings saved. Theme applied.");
      await utils.core.systemSettings.invalidate();
      window.dispatchEvent(new CustomEvent("sbts-system-settings-changed"));
      dispatchThemeChanged();
      await utils.core.notifications.invalidate();
      await utils.core.auditTrail.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const corporate = getCorporateIdentity(form.general);

  const summaryCards = useMemo(() => [
    { label: "Company", value: form.general.companyShortName || form.general.companyName || "Company", note: form.general.companySubtitle || `${form.general.facilityName} / ${form.general.departmentName}` },
    { label: "Tag Template", value: `${form.tags.defaultTagWidthCm} × ${form.tags.defaultTagHeightCm} cm`, note: `${form.tags.defaultQrSizePx}px QR` },
    { label: "Certificate", value: form.certificates.requireFinalApprovalBeforeIssue ? "Final approval required" : "Draft issue allowed", note: form.certificates.certificateTitle },
    { label: "Release", value: `${form.general.appVersionNumber ?? "V1.0"}`, note: `${form.general.releaseName ?? "Pilot Live"} · ${form.general.releaseYear ?? "2026"}` },
  ], [form]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  function resetDefaults() {
    setForm(defaultSettings);
    toast.message("Default system settings restored locally. Click Save to persist.");
  }

  if (settingsQuery.isLoading) {
    return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Loading System Settings Center...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Control Center"
        title="System Settings Center"
        description="Global SBTS defaults for facility identity, QR tags, certificates, notifications, and security. Project-specific settings still remain inside Project Setup."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={resetDefaults} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:border-cyan-200"><RotateCcw className="h-4 w-4" /> Defaults</button>
            <button type="submit" form="system-settings-form" disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"><Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save Settings"}</button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(card => <div key={card.label} className="sbts-card p-5"><div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{card.label}</div><div className="mt-2 text-xl font-black text-slate-950">{card.value}</div><div className="mt-1 text-sm font-semibold text-slate-500">{card.note}</div></div>)}
      </div>

      <section className="sbts-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><Database className="h-5 w-5" /></div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Production persistence</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">{persistenceQuery.data?.mode ?? "Checking"} Mode</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {persistenceQuery.data?.databaseAvailable
                  ? "Database persistence is active. Validate all critical workflows after every deployment."
                  : "Demo fallback is active until DATABASE_URL is configured and migrations are applied."}
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm font-bold text-slate-600 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="block text-xs uppercase tracking-wider text-slate-400">Schema</span>{persistenceQuery.data?.schemaVersion ?? "11.0.0"}</div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="block text-xs uppercase tracking-wider text-slate-400">Domains</span>{persistenceQuery.data?.domains?.length ?? 13}</div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3"><span className="block text-xs uppercase tracking-wider text-slate-400">Asset hierarchy</span>{persistenceQuery.data?.assetHierarchyDeferred ? "Deferred" : "Active"}</div>
          </div>
        </div>
      </section>

      <form id="system-settings-form" onSubmit={submit} className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="sbts-card h-fit p-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${active ? "bg-slate-950 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon className="h-5 w-5" /> {tab.label}
              </button>
            );
          })}
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-xs font-bold leading-5 text-cyan-900">
            System settings are global defaults. Project phase task assignment remains in Project Setup; tag identity is controlled here to avoid project-by-project errors.
          </div>
        </aside>

        <section className="sbts-card p-6">
          {activeTab === "general" && <div className="space-y-6">
            <SectionTitle icon={<Settings2 className="h-5 w-5" />} title="General Settings" description="Facility identity and display defaults used across dashboard, certificates, and print templates." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="System Name"><input value={form.general.systemName} onChange={e => setForm({ ...form, general: { ...form.general, systemName: e.target.value } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Facility / Plant"><input value={form.general.facilityName} onChange={e => setForm({ ...form, general: { ...form.general, facilityName: e.target.value } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Department"><input value={form.general.departmentName} onChange={e => setForm({ ...form, general: { ...form.general, departmentName: e.target.value } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Company Name"><input value={form.general.companyName ?? ""} onChange={e => setForm({ ...form, general: { ...form.general, companyName: e.target.value } })} placeholder="Saudi Aramco / Company Name" className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Company Short Name"><input value={form.general.companyShortName ?? ""} onChange={e => setForm({ ...form, general: { ...form.general, companyShortName: e.target.value } })} placeholder="Aramco / Company" className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Company Subtitle"><input value={form.general.companySubtitle ?? ""} onChange={e => setForm({ ...form, general: { ...form.general, companySubtitle: e.target.value } })} placeholder="Facility / Department" className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Logo Text"><input value={form.general.logoText} onChange={e => setForm({ ...form, general: { ...form.general, logoText: e.target.value } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Application Logo Upload">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-cyan-50 text-sm font-black text-cyan-800 ring-1 ring-cyan-100">
                      {form.general.logoUrl ? <img src={form.general.logoUrl} alt="Application logo preview" className="h-full w-full object-contain p-2" /> : "SB"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm({ ...form, general: { ...form.general, logoUrl: String(reader.result || "") } }); reader.readAsDataURL(file); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-cyan-800 hover:border-cyan-200" />
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">Application logo is used as a fallback app icon. Corporate logo/name are controlled below and appear in login, sidebar, tags, certificates, and reports.</div>
                    </div>
                    {form.general.logoUrl ? <button type="button" onClick={() => setForm({ ...form, general: { ...form.general, logoUrl: "" } })} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700">Clear</button> : null}
                  </div>
                </div>
              </Field>
              <Field label="Company Logo Upload">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-sm font-black text-white ring-1 ring-slate-200">
                      {form.general.companyLogoDataUrl ? <img src={form.general.companyLogoDataUrl} alt="Company logo preview" className="h-full w-full object-contain p-2" /> : initialsFromCompanyName(form.general.companyShortName || form.general.companyName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm({ ...form, general: { ...form.general, companyLogoDataUrl: String(reader.result || "") } }); reader.readAsDataURL(file); }} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-slate-700 hover:border-cyan-200" />
                      <div className="mt-1 text-[11px] font-semibold text-slate-500">Corporate logo appears beside company name in login, sidebar, certificates, tags, and reports.</div>
                    </div>
                    {form.general.companyLogoDataUrl ? <button type="button" onClick={() => setForm({ ...form, general: { ...form.general, companyLogoDataUrl: "" } })} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700">Clear</button> : null}
                  </div>
                </div>
              </Field>
              <div className="md:col-span-2 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <ToggleRow label="Show Name Beside Logo" description="Display company name next to logo." checked={form.general.showCompanyNameBesideLogo !== false} onChange={v => setForm({ ...form, general: { ...form.general, showCompanyNameBesideLogo: v } })} />
                <ToggleRow label="On Certificates" description="Print corporate identity on certificates." checked={form.general.showCompanyOnCertificates !== false} onChange={v => setForm({ ...form, general: { ...form.general, showCompanyOnCertificates: v } })} />
                <ToggleRow label="On Tags" description="Print logo/name on QR tags." checked={form.general.showCompanyOnTags !== false} onChange={v => setForm({ ...form, general: { ...form.general, showCompanyOnTags: v } })} />
                <ToggleRow label="On Reports" description="Print logo/name on reports." checked={form.general.showCompanyOnReports !== false} onChange={v => setForm({ ...form, general: { ...form.general, showCompanyOnReports: v } })} />
              </div>
              <Field label="Application Version"><input value={form.general.appVersionNumber ?? "V1.0"} onChange={e => setForm({ ...form, general: { ...form.general, appVersionNumber: e.target.value } })} placeholder="V1.0" className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Release Name"><input value={form.general.releaseName ?? "Pilot Live"} onChange={e => setForm({ ...form, general: { ...form.general, releaseName: e.target.value } })} placeholder="Pilot Live" className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Release Year"><input value={form.general.releaseYear ?? "2026"} onChange={e => setForm({ ...form, general: { ...form.general, releaseYear: e.target.value } })} placeholder="2026" className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Theme Template"><select value={form.general.themeTemplate ?? "Template 1"} onChange={e => setForm({ ...form, general: { ...form.general, themeTemplate: e.target.value as any } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100">{THEME_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
              <Field label="System Accent Color"><input type="color" value={form.general.customAccentColor ?? "#0891b2"} onChange={e => setForm({ ...form, general: { ...form.general, customAccentColor: e.target.value } })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Header Description"><input value={form.general.appDescription ?? ""} onChange={e => setForm({ ...form, general: { ...form.general, appDescription: e.target.value } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Dashboard Hero Title"><textarea value={form.general.dashboardHeroTitle ?? ""} onChange={e => setForm({ ...form, general: { ...form.general, dashboardHeroTitle: e.target.value } })} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Dashboard Hero Description"><textarea value={form.general.dashboardHeroDescription ?? ""} onChange={e => setForm({ ...form, general: { ...form.general, dashboardHeroDescription: e.target.value } })} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Default Language"><select value={form.general.defaultLanguage} onChange={e => setForm({ ...form, general: { ...form.general, defaultLanguage: e.target.value as SettingsForm["general"]["defaultLanguage"] } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"><option>English</option><option>Arabic</option></select></Field>
              <Field label="Date Format"><select value={form.general.dateFormat} onChange={e => setForm({ ...form, general: { ...form.general, dateFormat: e.target.value as SettingsForm["general"]["dateFormat"] } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></Field>
              <Field label="Time Format"><select value={form.general.timeFormat} onChange={e => setForm({ ...form, general: { ...form.general, timeFormat: e.target.value as SettingsForm["general"]["timeFormat"] } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"><option>24H</option><option>12H</option></select></Field>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
              <div className="mb-3 text-sm font-black text-slate-950">Corporate Identity Preview</div>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-lg font-black text-white">
                    {corporate.companyLogo ? <img src={corporate.companyLogo} alt="Company" className="h-full w-full object-contain p-2" /> : initialsFromCompanyName(corporate.companyShortName)}
                  </div>
                  <div>
                    <div className="text-xl font-black text-slate-950">{corporate.showName ? corporate.companyName : form.general.systemName}</div>
                    <div className="text-sm font-bold text-slate-500">{corporate.companySubtitle}</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white">{form.general.systemName}</div>
              </div>
            </div>
            <div className={`rounded-[2rem] border border-slate-200 p-5 ${themeClassFor(form.general.themeTemplate)}`} style={{ "--sbts-accent": form.general.customAccentColor ?? "#0891b2" } as any}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-950">Theme Live Preview</div>
                  <div className="text-xs font-bold text-slate-500">{themeDisplayName(form.general.themeTemplate)} — this preview changes before saving.</div>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">System default</span>
              </div>
              <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                <div className="rounded-2xl bg-slate-950 p-4 text-white theme-preview-sidebar">
                  <div className="mb-4 text-sm font-black">SBTS</div>
                  <div className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950">Dashboard</div>
                  <div className="mt-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300">Projects</div>
                  <div className="mt-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300">Settings</div>
                </div>
                <div className="sbts-card p-4">
                  <div className="text-sm font-black text-slate-950">{form.general.systemName}</div>
                  <div className="text-xs font-bold text-slate-500">{form.general.facilityName} · {form.general.departmentName}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="text-xs font-bold text-slate-500">Tracked blinds</div><div className="text-2xl font-black text-slate-950">128</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="text-xs font-bold text-slate-500">Pending</div><div className="text-2xl font-black text-cyan-700">14</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="text-xs font-bold text-slate-500">Final</div><div className="text-2xl font-black text-emerald-700">42</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>}

          {activeTab === "tags" && <div className="space-y-6">
            <SectionTitle icon={<Tags className="h-5 w-5" />} title="Default Tag Settings" description="Global default for 11 × 7 cm hanging QR tags. Corporate logo/name are controlled from General → Corporate Identity to avoid duplicate branding." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Width cm"><input type="number" min={5} max={30} value={form.tags.defaultTagWidthCm} onChange={e => setForm({ ...form, tags: { ...form.tags, defaultTagWidthCm: Number(e.target.value) } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Height cm"><input type="number" min={4} max={30} value={form.tags.defaultTagHeightCm} onChange={e => setForm({ ...form, tags: { ...form.tags, defaultTagHeightCm: Number(e.target.value) } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="QR Size px"><input type="number" min={72} max={260} value={form.tags.defaultQrSizePx} onChange={e => setForm({ ...form, tags: { ...form.tags, defaultQrSizePx: Number(e.target.value) } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Tag Color"><input type="color" value={form.tags.defaultTagColor} onChange={e => setForm({ ...form, tags: { ...form.tags, defaultTagColor: e.target.value } })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Accent Color"><input type="color" value={form.tags.defaultAccentColor} onChange={e => setForm({ ...form, tags: { ...form.tags, defaultAccentColor: e.target.value } })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Text Color"><input type="color" value={form.tags.defaultTextColor} onChange={e => setForm({ ...form, tags: { ...form.tags, defaultTextColor: e.target.value } })} className="h-12 w-full rounded-2xl border border-slate-200 bg-white p-1" /></Field>
              <Field label="Font Scale"><input type="number" min={80} max={150} value={form.tags.fontScale ?? 100} onChange={e => setForm({ ...form, tags: { ...form.tags, fontScale: Number(e.target.value) } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Hanging Hole Size px"><input type="number" min={6} max={80} value={form.tags.holeSizePx ?? 20} onChange={e => setForm({ ...form, tags: { ...form.tags, holeSizePx: Number(e.target.value) } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
              <div className="mb-3 text-sm font-black text-slate-950">Live Tag Preview</div>
              <div className="relative mx-auto rounded-[0.45cm] border-2 border-slate-900 p-4 shadow-sm" style={{ width: `${form.tags.defaultTagWidthCm}cm`, maxWidth: "100%", minHeight: `${form.tags.defaultTagHeightCm}cm`, background: form.tags.defaultTagColor, color: form.tags.defaultTextColor, fontSize: `${form.tags.fontScale ?? 100}%` }}>
                {form.tags.showHole !== false && <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border-2 bg-white" style={{ width: form.tags.holeSizePx ?? 20, height: form.tags.holeSizePx ?? 20, borderColor: form.tags.defaultTextColor }} />}
                <div className="grid h-full grid-cols-[1fr_auto] gap-4 pt-5">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: form.tags.defaultAccentColor }}>{corporate.showOnTags && corporate.companyLogo ? <img src={corporate.companyLogo} alt="Logo" className="h-10 w-10 rounded-lg bg-white p-1 object-contain" /> : null}{corporate.showOnTags ? corporate.companyShortName : form.general.logoText}</div>
                    <div className="mt-1 text-3xl font-black">SB-0001</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black"><div className="rounded-xl bg-white/70 p-2">Area<br/>SGP-04</div><div className="rounded-xl bg-white/70 p-2">Line<br/>D-111</div><div className="rounded-xl bg-white/70 p-2">Size<br/>12 in</div><div className="rounded-xl bg-white/70 p-2">Rating<br/>300#</div></div>
                  </div>
                  <QRCodeBlock value="SBTS-PREVIEW-SB-0001" label="QR Preview" size={Math.min(form.tags.defaultQrSizePx, 120)} />
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label="Show Hanging Hole" description="Show center hole mark for tag hanging." checked={form.tags.showHole !== false} onChange={v => setForm({ ...form, tags: { ...form.tags, showHole: v } })} />
              <ToggleRow label="Show Area" description="Print area code/name on default tag." checked={form.tags.showArea} onChange={v => setForm({ ...form, tags: { ...form.tags, showArea: v } })} />
              <ToggleRow label="Show Line" description="Print line number clearly." checked={form.tags.showLine} onChange={v => setForm({ ...form, tags: { ...form.tags, showLine: v } })} />
              <ToggleRow label="Show Size" description="Show blind size as a separate field." checked={form.tags.showSize} onChange={v => setForm({ ...form, tags: { ...form.tags, showSize: v } })} />
              <ToggleRow label="Show Rating" description="Show flange/rating class." checked={form.tags.showRating} onChange={v => setForm({ ...form, tags: { ...form.tags, showRating: v } })} />
              <ToggleRow label="Show Project No" description="Keep traceability to project package." checked={form.tags.showProjectNo} onChange={v => setForm({ ...form, tags: { ...form.tags, showProjectNo: v } })} />
              <ToggleRow label="Show Blind Type" description="Display slip blind / blind / drop spool type." checked={form.tags.showBlindType} onChange={v => setForm({ ...form, tags: { ...form.tags, showBlindType: v } })} />
            </div>
          </div>}

          {activeTab === "certificates" && <div className="space-y-6">
            <SectionTitle icon={<FileCheck2 className="h-5 w-5" />} title="Certificate Settings" description="Controls certificate identity and which operational sections are visible on the generated package." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Certificate Title"><input value={form.certificates.certificateTitle} onChange={e => setForm({ ...form, certificates: { ...form.certificates, certificateTitle: e.target.value } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Certificate No Format"><input value={form.certificates.certificateNoFormat} onChange={e => setForm({ ...form, certificates: { ...form.certificates, certificateNoFormat: e.target.value } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Certificate Logo Upload"><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm({ ...form, certificates: { ...form.certificates, certificateLogoUrl: String(reader.result || "") } }); reader.readAsDataURL(file); }} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
              <Field label="Font Scale"><input type="number" min={80} max={150} value={form.certificates.fontScale ?? 100} onChange={e => setForm({ ...form, certificates: { ...form.certificates, fontScale: Number(e.target.value) } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label="Require Final Approval Before Issue" description="Prevents certificate release before final approval gate." checked={form.certificates.requireFinalApprovalBeforeIssue} onChange={v => setForm({ ...form, certificates: { ...form.certificates, requireFinalApprovalBeforeIssue: v } })} />
              <ToggleRow label="Show Torque Section" description="Include torque machine, PSI, and technician details." checked={form.certificates.showTorqueSection} onChange={v => setForm({ ...form, certificates: { ...form.certificates, showTorqueSection: v } })} />
              <ToggleRow label="Show Approval Section" description="Include final approval and status section." checked={form.certificates.showApprovalSection} onChange={v => setForm({ ...form, certificates: { ...form.certificates, showApprovalSection: v } })} />
              <ToggleRow label="Show QR Code" description="Print QR for traceability to live blind record." checked={form.certificates.showQrCode} onChange={v => setForm({ ...form, certificates: { ...form.certificates, showQrCode: v } })} />
              <ToggleRow label="Show Activity Summary" description="Include summarized workflow log inside certificate." checked={form.certificates.showActivitySummary} onChange={v => setForm({ ...form, certificates: { ...form.certificates, showActivitySummary: v } })} />
              <ToggleRow label="Show Revision Number" description="Make revision visible for certificate control." checked={form.certificates.showRevisionNumber} onChange={v => setForm({ ...form, certificates: { ...form.certificates, showRevisionNumber: v } })} />
            </div>
          </div>}

          {activeTab === "approvals" && <div className="space-y-6">
            <SectionTitle icon={<ListChecks className="h-5 w-5" />} title="Final Approval Profiles" description="Define final approval people by blind type. Slip Blind, Blind, and Drop Spool can have different required approvers before certificate release." />
            <div className="space-y-4">
              {(form.approvals?.profiles ?? []).map((profile, index) => (
                <div key={`${profile.blindType}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-[180px_1fr_120px_120px] md:items-center">
                    <input value={profile.blindType} onChange={e => { const profiles = [...(form.approvals?.profiles ?? [])]; profiles[index] = { ...profile, blindType: e.target.value }; setForm({ ...form, approvals: { profiles } }); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
                    <input value={profile.requiredApprovers.join(", ")} onChange={e => { const profiles = [...(form.approvals?.profiles ?? [])]; profiles[index] = { ...profile, requiredApprovers: e.target.value.split(",").map(v => v.trim()).filter(Boolean) }; setForm({ ...form, approvals: { profiles } }); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
                    <label className="flex items-center gap-2 text-xs font-black text-slate-600"><input type="checkbox" checked={profile.requireAll} onChange={e => { const profiles = [...(form.approvals?.profiles ?? [])]; profiles[index] = { ...profile, requireAll: e.target.checked }; setForm({ ...form, approvals: { profiles } }); }} /> Require all</label>
                    <button type="button" onClick={() => setForm({ ...form, approvals: { profiles: (form.approvals?.profiles ?? []).filter((_, i) => i !== index) } })} className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm({ ...form, approvals: { profiles: [...(form.approvals?.profiles ?? []), { blindType: "New Type", requiredApprovers: ["Operation Foreman"], requireAll: true, unlockCertificate: true }] } })} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Add Approval Profile</button>
          </div>}

          {activeTab === "masterData" && <div className="space-y-6">
            <SectionTitle icon={<ListChecks className="h-5 w-5" />} title="Master Data / Catalogs" description="Control selectable values used by forms. This prevents hard-coded blind types and reduces future maintenance." />
            <Field label="Blind Types"><textarea value={(form.masterData?.blindTypes ?? []).join("\n")} onChange={e => setForm({ ...form, masterData: { blindTypes: e.target.value.split(/\n|,/).map(v => v.trim()).filter(Boolean) } })} rows={8} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
          </div>}

          {activeTab === "notifications" && <div className="space-y-6">
            <SectionTitle icon={<Bell className="h-5 w-5" />} title="Notification Settings" description="Choose which operational events create inbox notifications. Email/Teams can be attached later." />
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label="New Blind Created" description="Notify coordinators when a blind is added." checked={form.notifications.notifyOnNewBlind} onChange={v => setForm({ ...form, notifications: { ...form.notifications, notifyOnNewBlind: v } })} />
              <ToggleRow label="Phase Updated" description="Notify on workflow phase transitions." checked={form.notifications.notifyOnPhaseUpdate} onChange={v => setForm({ ...form, notifications: { ...form.notifications, notifyOnPhaseUpdate: v } })} />
              <ToggleRow label="Approval Required" description="Create inbox action for final approvals." checked={form.notifications.notifyOnApprovalRequired} onChange={v => setForm({ ...form, notifications: { ...form.notifications, notifyOnApprovalRequired: v } })} />
              <ToggleRow label="Certificate Issued" description="Notify when certificate is saved or printed." checked={form.notifications.notifyOnCertificateIssued} onChange={v => setForm({ ...form, notifications: { ...form.notifications, notifyOnCertificateIssued: v } })} />
              <ToggleRow label="Tag Printed" description="Notify and audit when tags are printed." checked={form.notifications.notifyOnTagPrinted} onChange={v => setForm({ ...form, notifications: { ...form.notifications, notifyOnTagPrinted: v } })} />
              <ToggleRow label="Rejected Approval" description="Escalate rejected approvals to inbox." checked={form.notifications.notifyOnRejectedApproval} onChange={v => setForm({ ...form, notifications: { ...form.notifications, notifyOnRejectedApproval: v } })} />
            </div>
          </div>}

          {activeTab === "security" && <div className="space-y-6">
            <SectionTitle icon={<ShieldCheck className="h-5 w-5" />} title="Security Settings" description="Global security posture for QR access, delete actions, audit trail, and session behavior." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Session Timeout Hours"><input type="number" min={1} max={72} value={form.security.sessionTimeoutHours} onChange={e => setForm({ ...form, security: { ...form.security, sessionTimeoutHours: Number(e.target.value) } })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-bold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" /></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow label="Require Login For QR Actions" description="QR can show data, but updates require authenticated employee." checked={form.security.requireLoginForQrActions} onChange={v => setForm({ ...form, security: { ...form.security, requireLoginForQrActions: v } })} />
              <ToggleRow label="Allow Visitor QR View" description="Permit read-only QR view for visitors/operators." checked={form.security.allowVisitorQrView} onChange={v => setForm({ ...form, security: { ...form.security, allowVisitorQrView: v } })} />
              <ToggleRow label="Admin Pages Hard Lock" description="Keep admin pages blocked for non-admin roles." checked={form.security.adminPagesHardLock} onChange={v => setForm({ ...form, security: { ...form.security, adminPagesHardLock: v } })} />
              <ToggleRow label="Allow Delete Actions" description="Enable delete actions in admin/project pages." checked={form.security.allowDeleteActions} onChange={v => setForm({ ...form, security: { ...form.security, allowDeleteActions: v } })} />
              <ToggleRow label="Require Delete Confirmation" description="Require confirmation prompt before destructive actions." checked={form.security.requireDeleteConfirmation} onChange={v => setForm({ ...form, security: { ...form.security, requireDeleteConfirmation: v } })} />
              <ToggleRow label="Enable Audit Trail" description="Record critical configuration and operational actions." checked={form.security.enableAuditTrail} onChange={v => setForm({ ...form, security: { ...form.security, enableAuditTrail: v } })} />
            </div>
          </div>}
        </section>
      </form>
    </div>
  );
}

function SectionTitle({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">{icon}</div>
      <div>
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-500">{description}</p>
      </div>
    </div>
  );
}
