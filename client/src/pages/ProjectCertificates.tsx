import { ArrowLeft, FileText, Printer, Save } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { PageHeader } from "@/components/common/PageHeader";
import { QRCodeBlock, buildBlindQrValue } from "@/components/common/QRCodeBlock";
import { PrintStyles } from "@/components/print/PrintStyles";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getCorporateIdentity, initialsFromCompanyName } from "@/lib/corporateIdentity";
import { buildPrintFileName, printWithMode } from "@/lib/printExport";

export default function ProjectCertificates() {
  const [, params] = useRoute("/projects/:id/certificates");
  const [, setLocation] = useLocation();
  const projectId = params?.id ?? "";
  const utils = trpc.useUtils();
  const projectsQuery = trpc.core.projects.useQuery(undefined, { staleTime: 20_000 });
  const blindsQuery = trpc.core.blinds.useQuery(undefined, { staleTime: 20_000 });
  const certificatesQuery = trpc.core.certificates.useQuery({ projectId }, { enabled: Boolean(projectId), staleTime: 10_000 });
  const settingsQuery = trpc.core.systemSettings.useQuery(undefined, { staleTime: 30_000 });
  const corporate = getCorporateIdentity(settingsQuery.data?.general as any);
  const project = projectsQuery.data?.find(item => item.id === projectId);
  const blinds = (blindsQuery.data ?? []).filter(item => item.projectId === projectId);
  const certificates = certificatesQuery.data ?? [];

  const issueCertificateMutation = trpc.core.issueCertificate.useMutation({
    onSuccess: async cert => {
      toast.success(`${cert.certificateNo} saved.`);
      await utils.core.certificates.invalidate({ projectId });
    },
    onError: error => toast.error(error.message),
  });

  async function saveMissingCertificates() {
    let count = 0;
    let blocked = 0;
    for (const blind of blinds) {
      const hasCertificate = certificates.some(cert => cert.blindId === blind.id && cert.status !== "Superseded");
      if (hasCertificate) continue;
      try {
        await issueCertificateMutation.mutateAsync({ blindId: blind.id, status: "Issued" });
        count += 1;
      } catch {
        blocked += 1;
      }
    }
    if (count) toast.success(`${count} certificate records created.`);
    if (blocked) toast.warning(`${blocked} certificate(s) blocked by approval lock.`);
  }

  if (projectsQuery.isLoading || blindsQuery.isLoading || certificatesQuery.isLoading) return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Preparing certificates...</div>;
  if (!project) return <div className="sbts-card p-8 text-sm font-bold text-slate-500">Project not found.</div>;

  return (
    <div className="space-y-6">
      <PrintStyles />
      <div className="no-print">
        <PageHeader
          eyebrow="PDF-ready Certificate Package"
          title={`${project.projectNo} · Certificate Register & Print Package`}
          description="Certificates can now be saved as system records, revised, and printed as a project package."
          actions={
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setLocation(`/projects/${project.id}`)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm"><ArrowLeft className="h-4 w-4" /> Project</button>
              <button onClick={saveMissingCertificates} disabled={issueCertificateMutation.isPending} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"><Save className="h-4 w-4" /> Save Missing</button>
              <button onClick={() => printWithMode("certificate-package", buildPrintFileName("SBTS_CERTIFICATE_PACKAGE", project.projectNo))} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg"><Printer className="h-4 w-4" /> Print Package</button>
            </div>
          }
        />
      </div>

      <section className="no-print grid gap-4 md:grid-cols-4">
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Project Blinds</div><div className="mt-2 text-3xl font-black text-slate-950">{blinds.length}</div></div>
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Saved Certificates</div><div className="mt-2 text-3xl font-black text-cyan-700">{certificates.filter(item => item.status !== "Superseded").length}</div></div>
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Printed</div><div className="mt-2 text-3xl font-black text-emerald-600">{certificates.filter(item => item.status === "Printed").length}</div></div>
        <div className="sbts-card p-5"><div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Revisions</div><div className="mt-2 text-3xl font-black text-slate-950">{certificates.length}</div></div>
      </section>

      {blinds.map(blind => {
        const latest = certificates.find(cert => cert.blindId === blind.id && cert.status !== "Superseded");
        return (
          <article key={blind.id} className="certificate-page print-page mx-auto rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-xl">
            <header className="flex items-start justify-between gap-5 border-b-2 border-slate-900 pb-5">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  {corporate.showOnCertificates && corporate.companyLogo ? <img src={corporate.companyLogo} alt="Company" className="h-16 w-16 rounded-2xl bg-white p-2 object-contain" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">{initialsFromCompanyName(corporate.companyShortName)}</div>}
                  <div><div className="text-base font-black text-slate-950">{corporate.showOnCertificates ? corporate.companyName : "SBTS"}</div><div className="text-xs font-bold text-slate-500">{corporate.companySubtitle}</div></div>
                </div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">SBTS · Blind Certificate Cover</div>
                <h1 className="mt-2 text-3xl font-black text-slate-950">{blind.tagNo}</h1>
                <div className="mt-2 text-sm font-bold text-slate-600">Certificate No: <span className="text-slate-950">{latest?.certificateNo ?? `SBTS-CERT-${blind.tagNo.replace(/[^A-Z0-9]/gi, "")}-R01`}</span></div>
                <div className="mt-1 text-sm font-bold text-slate-600">Persisted Status: <span className="text-slate-950">{latest?.status ?? "Not Saved"}</span></div>
                <div className="mt-1 text-sm font-bold text-slate-600">Project: {project.projectNo} · {project.name}</div>
              </div>
              <QRCodeBlock value={buildBlindQrValue(blind.id, blind.tagNo)} label={blind.tagNo} size={132} />
            </header>
            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["Blind No", blind.blindNo],
                ["Area", blind.areaCode],
                ["Line", blind.lineNo],
                ["Size / Rating", `${blind.size} / ${blind.rating ?? "N/A"}`],
                ["Type", blind.blindType],
                ["Status", blind.status],
                ["Phase", blind.phaseLabel],
                ["Priority", blind.priority],
                ["Location", blind.locationNote ?? "N/A"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
                  <div className="mt-1 text-sm font-black text-slate-950">{value}</div>
                </div>
              ))}
            </section>
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {["Execution", "Torque / QA", "Final Approval"].map(section => (
                <div key={section} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-950"><FileText className="h-4 w-4 text-cyan-700" /> {section}</div>
                  <div className="mt-16 border-t border-slate-400 pt-2 text-xs font-bold text-slate-500">Signature / Date</div>
                </div>
              ))}
            </section>
            <footer className="mt-8 rounded-2xl bg-slate-950 p-4 text-xs font-bold leading-5 text-white">Scan the QR code to open the live SBTS Blind Details page for workflow logs, torque records, approvals, and certificate regeneration.</footer>
          </article>
        );
      })}

      {blinds.length === 0 && <div className="sbts-card p-8 text-center text-sm font-bold text-slate-500">No blinds in this project yet.</div>}
    </div>
  );
}
