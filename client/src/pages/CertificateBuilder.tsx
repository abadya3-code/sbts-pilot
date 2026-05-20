import { ArrowLeft, BadgeCheck, ClipboardCheck, FileText, Printer, Save, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { QRCodeBlock, buildBlindQrValue } from "@/components/common/QRCodeBlock";
import { PrintStyles } from "@/components/print/PrintStyles";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getCorporateIdentity, initialsFromCompanyName } from "@/lib/corporateIdentity";
import { buildPrintFileName, printWithMode } from "@/lib/printExport";


function formatDateTime(value?: string | Date | null) {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function formatDate(value?: string | Date | null) {
  if (!value) return formatDate();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate();
  return date.toLocaleDateString();
}

function phaseName(key?: string | null) {
  const map: Record<string, string> = {
    broken: "Broken / Preparation",
    assembly: "Assembly",
    tightTorque: "Tight & Torque",
    finalTight: "Final Tight",
    inspectionReady: "Inspection Ready",
  };
  return key ? map[key] ?? key : "N/A";
}

export default function CertificateBuilder() {
  const [location, setLocation] = useLocation();
  const id = decodeURIComponent(location.split("/blinds/")[1]?.split("/certificate")[0] ?? "");
  const utils = trpc.useUtils();
  const blindQuery = trpc.core.blindDetail.useQuery({ id }, { enabled: Boolean(id), staleTime: 10_000 });
  const torqueQuery = trpc.core.torqueRecords.useQuery({ blindId: blindQuery.data?.id ?? "" }, { enabled: Boolean(blindQuery.data?.id), staleTime: 10_000 });
  const approvalsQuery = trpc.core.approvalCenter.useQuery(undefined, { staleTime: 10_000 });
  const certificatesQuery = trpc.core.certificates.useQuery({ blindId: blindQuery.data?.id ?? "" }, { enabled: Boolean(blindQuery.data?.id), staleTime: 10_000 });
  const certificateLockQuery = trpc.core.certificateLock.useQuery({ blindId: blindQuery.data?.id ?? "" }, { enabled: Boolean(blindQuery.data?.id), staleTime: 10_000 });
  const settingsQuery = trpc.core.systemSettings.useQuery(undefined, { staleTime: 20_000 });
  const blind = blindQuery.data;
  const certSettings = settingsQuery.data?.certificates;
  const generalSettings = settingsQuery.data?.general;
  const corporate = getCorporateIdentity(generalSettings as any);
  const certificateLogo = corporate.showOnCertificates ? (corporate.companyLogo || (certSettings as any)?.certificateLogoUrl || "") : ((certSettings as any)?.certificateLogoUrl || "");
  const torqueRecords = torqueQuery.data ?? [];
  const approvals = (approvalsQuery.data ?? []).filter(item => item.blindId === blind?.id);
  const approvalProfile = ((settingsQuery.data as any)?.approvals?.profiles ?? []).find((profile: any) => String(blind?.blindType ?? "").toLowerCase().includes(String(profile.blindType).toLowerCase())) ?? ((settingsQuery.data as any)?.approvals?.profiles ?? []).find((profile: any) => String(profile.blindType).toLowerCase() === "blind");
  const lockStatus = certificateLockQuery.data;
  const requiredApprovers = lockStatus?.requiredApprovers?.map(item => item.label) ?? approvalProfile?.requiredApprovers ?? ["Operation Foreman", "Project Engineer", "Inspection Unit"];
  const latestCertificate = certificatesQuery.data?.[0];
  const certNo = latestCertificate?.certificateNo ?? (blind ? `SBTS-CERT-${blind.tagNo.replace(/[^A-Z0-9]/gi, "")}-R01` : "SBTS-CERT");

  const issueCertificateMutation = trpc.core.issueCertificate.useMutation({
    onSuccess: async cert => {
      await utils.core.certificates.invalidate({ blindId: blind?.id ?? "" });
      await utils.core.certificateLock.invalidate({ blindId: blind?.id ?? "" });
      await utils.core.blindDetail.invalidate({ id });
      toast.success(`${cert.certificateNo} saved to certificate register.`);
    },
    onError: error => toast.error(error.message),
  });

  function saveCertificate(status: "Draft" | "Issued" | "Printed") {
    if (!blind) return;
    issueCertificateMutation.mutate({ blindId: blind.id, status });
  }

  if (blindQuery.isLoading) return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Building certificate...</div>;
  if (!blind) {
    return (
      <div className="space-y-5">
        <button onClick={() => setLocation("/projects")} className="inline-flex items-center gap-2 text-sm font-extrabold text-cyan-700"><ArrowLeft className="h-4 w-4" /> Back</button>
        <div className="sbts-card p-8"><h1 className="text-xl font-extrabold text-slate-950">Blind not found</h1></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrintStyles />
      <div className="no-print">
        <PageHeader
          eyebrow="Certificate Builder"
          title={`${certNo} · ${blind.tagNo}`}
          description="Certificate preview is generated from blind details, workflow logs, torque records, approvals, and the blind QR code."
          actions={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setLocation(`/blinds/${blind.id}`)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm"><ArrowLeft className="h-4 w-4" /> Blind Details</button>
              <button onClick={() => saveCertificate("Issued")} disabled={issueCertificateMutation.isPending || Boolean(lockStatus?.locked)} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"><Save className="h-4 w-4" /> Save Certificate</button>
              <button disabled={Boolean(lockStatus?.locked)} onClick={() => { saveCertificate("Printed"); printWithMode("certificate", buildPrintFileName("SBTS_CERTIFICATE", blind.tagNo)); }} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"><Printer className="h-4 w-4" /> Print Certificate</button>
            </div>
          }
        />
      </div>

      <section className="no-print grid gap-4 md:grid-cols-4">
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Persisted Status</div><div className="mt-2 text-lg font-black text-slate-950">{latestCertificate?.status ?? "Not Saved"}</div></div>
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Revision</div><div className="mt-2 text-lg font-black text-cyan-700">R{latestCertificate?.revision ?? 1}</div></div>
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Issued By</div><div className="mt-2 text-sm font-black text-slate-950">{latestCertificate?.issuedByOpenId ?? "Pending"}</div></div>
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Saved Records</div><div className="mt-2 text-lg font-black text-slate-950">{certificatesQuery.data?.length ?? 0}</div></div>
      </section>
      <section className={`no-print rounded-3xl border p-5 ${lockStatus?.locked ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] opacity-70">Certificate Lock</div>
            <div className="mt-1 text-xl font-black">{lockStatus?.locked ? "Locked" : "Unlocked"}</div>
            <p className="mt-1 text-sm font-bold">{lockStatus?.reason ?? "Checking approval profile..."}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-black">
            <div className="rounded-2xl bg-white/70 px-3 py-2"><div className="text-lg">{lockStatus?.approvedCount ?? 0}</div><div>Approved</div></div>
            <div className="rounded-2xl bg-white/70 px-3 py-2"><div className="text-lg">{lockStatus?.pendingCount ?? 0}</div><div>Pending</div></div>
            <div className="rounded-2xl bg-white/70 px-3 py-2"><div className="text-lg">{lockStatus?.missingCount ?? 0}</div><div>Missing</div></div>
            <div className="rounded-2xl bg-white/70 px-3 py-2"><div className="text-lg">{lockStatus?.rejectedCount ?? 0}</div><div>Rejected</div></div>
          </div>
        </div>
      </section>


      <article className="certificate-page print-page mx-auto rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl" style={{ fontSize: `${certSettings?.fontScale ?? 100}%` }}>
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-5 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-sm font-black text-white">{certificateLogo ? <img src={certificateLogo} alt="Logo" className="h-full w-full object-contain p-1" /> : initialsFromCompanyName(corporate.companyShortName)}</div>
            <div><div className="text-sm font-black text-slate-950">{corporate.showOnCertificates ? corporate.companyName : (generalSettings?.logoText ?? "Smart Blind Tag System")}</div><div className="text-xs font-bold text-slate-500">{corporate.showOnCertificates ? corporate.companySubtitle : (generalSettings?.facilityName ?? "Facility")}</div></div>
          </div>
          <div className="text-center"><h1 className="text-xl font-black text-slate-950">{certSettings?.certificateTitle ?? "Smart Blind Tag System Certificate"}</h1><div className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">APPROVED PACKAGE</div><div className="mt-1 text-[10px] font-bold text-slate-500">{certNo}</div></div>
          <div className="text-right"><div className="inline-flex rounded-2xl border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700">{blind.status}</div><div className="mt-2 text-sm font-black text-slate-950">{blind.projectName}</div><div className="text-xs font-bold text-slate-500">Generated: {latestCertificate?.issuedAt ? formatDate(latestCertificate.issuedAt) : formatDate()}</div></div>
        </header>

        <section className="mt-4 grid gap-2 md:grid-cols-2">
          {[
            ["Tag No", blind.tagNo],
            ["Blind No", blind.blindNo],
            ["Project", `${blind.projectNo ?? ""} · ${blind.projectName}`],
            ["Area", `${blind.areaCode} · ${blind.areaName ?? ""}`],
            ["Line", blind.lineNo],
            ["Size / Rating", `${blind.size} / ${blind.rating ?? "N/A"}`],
            ["Type", blind.blindType],
            ["Current Phase", blind.phaseLabel],
            ["Status", blind.status],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
              <div className="mt-1 text-sm font-black text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-[1fr_150px]">
          {certSettings?.showTorqueSection !== false && <div className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-2"><Wrench className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-black text-slate-950">Torque Records</h2></div>
            <div className="space-y-3">
              {torqueRecords.length ? torqueRecords.map(record => (
                <div key={String(record.id)} className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-slate-700">
                  <div className="font-black text-slate-950">{record.machineType} · {record.psiValue} PSI</div>
                  <div className="mt-1">Technician: {record.technicianName ?? "N/A"} {record.technicianBadge ? `(${record.technicianBadge})` : ""}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDateTime(record.createdAt)} · {record.remarks ?? "No remarks"}</div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500">No torque records captured yet.</div>}
            </div>
          </div>}

          {certSettings?.showApprovalSection !== false && <div className="rounded-3xl border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-black text-slate-950">Final Approval Summary</h2></div>
            <div className="space-y-3">
              {lockStatus?.requiredApprovers?.length ? lockStatus.requiredApprovers.map(item => (
                <div key={item.label} className={`rounded-2xl p-3 text-sm font-bold ${item.status === "Approved" ? "bg-emerald-50 text-emerald-800" : item.status === "Rejected" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}>
                  <div className="font-black">{item.label} · {item.status}</div>
                  <div className="mt-1 text-xs opacity-75">Role: {item.roleKey}</div>
                  <div className="mt-1 text-xs opacity-75">Approved by: {item.approvedByName ?? "Pending"}</div>
                </div>
              )) : approvals.length ? approvals.map(approval => (
                <div key={String(approval.id)} className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-slate-700">
                  <div className="font-black text-slate-950">{approval.phaseLabel} · {approval.status}</div>
                  <div className="mt-1">Required Role: {approval.requiredRoleLabel}</div>
                  <div className="mt-1 text-xs text-slate-500">Approved by: {approval.approvedByName ?? approval.approvedByOpenId ?? "Pending"}</div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-bold text-slate-500">No approval requests recorded yet.</div>}
            </div>
          </div>}
        </section>

        {certSettings?.showActivitySummary !== false && <section className="mt-6 rounded-3xl border border-slate-200 p-5">
          <div className="mb-4 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-cyan-700" /><h2 className="text-lg font-black text-slate-950">Workflow Log</h2></div>
          <div className="divide-y divide-slate-100">
            {(blind.logs ?? []).slice(0, 8).map(log => (
              <div key={String(log.id)} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_160px]">
                <div>
                  <div className="font-black text-slate-950">{log.action} · {phaseName(log.toPhaseKey)}</div>
                  <div className="mt-1 font-semibold text-slate-500">{log.remarks ?? "No remarks"}</div>
                </div>
                <div className="text-xs font-bold text-slate-500 md:text-right">{formatDateTime(log.createdAt)}</div>
              </div>
            ))}
          </div>
        </section>}

        <footer className="mt-6 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-3">
          {requiredApprovers.map((role: string) => (
            <div key={role} className="rounded-2xl border border-slate-200 p-4">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500">{role}</div>
              <div className="mt-8 border-t border-slate-400 pt-2 text-xs font-bold text-slate-500">Digital approval / Date</div>
            </div>
          ))}
        </footer>
      </article>
    </div>
  );
}
