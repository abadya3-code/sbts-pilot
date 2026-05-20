export function PrintStyles() {
  return (
    <style>{`
      @media screen {
        .print-only { display: none !important; }
      }

      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        html, body {
          background: white !important;
          width: auto !important;
          min-width: 0 !important;
        }

        body[data-sbts-print-mode] .no-print,
        body[data-sbts-print-mode] aside,
        body[data-sbts-print-mode] nav,
        body[data-sbts-print-mode] header.no-print,
        body[data-sbts-print-mode] .sbts-sidebar,
        body[data-sbts-print-mode] .app-sidebar,
        body[data-sbts-print-mode] .topbar {
          display: none !important;
        }

        .print-only { display: block !important; }

        main, .container, .sbts-content, .sbts-main {
          padding: 0 !important;
          margin: 0 !important;
          max-width: none !important;
          width: 100% !important;
          background: white !important;
        }

        .print-page {
          break-after: page;
          page-break-after: always;
          break-inside: avoid;
          page-break-inside: avoid;
          box-shadow: none !important;
          overflow: hidden !important;
          background: white !important;
        }

        .print-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .print-grid {
          display: block !important;
        }

        .tag-card {
          page: sbtsTagPage;
          width: 11cm !important;
          height: 7cm !important;
          min-width: 11cm !important;
          min-height: 7cm !important;
          max-width: 11cm !important;
          max-height: 7cm !important;
          margin: 0 auto !important;
          break-after: page;
          page-break-after: always;
          page-break-inside: avoid;
          break-inside: avoid;
          box-shadow: none !important;
          border-radius: 0.35cm !important;
          overflow: hidden !important;
          transform: none !important;
        }

        .tag-card:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        .tag-card img {
          object-fit: contain !important;
        }

        .certificate-page {
          page: sbtsCertificatePage;
          width: 19cm !important;
          min-height: 27cm !important;
          max-height: 27cm !important;
          margin: 0 auto !important;
          padding: 0.5cm !important;
          box-shadow: none !important;
          border: 2px solid #0f172a !important;
          border-radius: 0.28cm !important;
          overflow: hidden !important;
          background: white !important;
          font-size: 82% !important;
        }

        .report-print-page {
          page: sbtsReportPage;
          width: 19cm !important;
          min-height: 27cm !important;
          margin: 0 auto !important;
          padding: 0.55cm !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          break-after: page;
          page-break-after: always;
        }

        .report-print-page:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        table {
          page-break-inside: auto;
          border-collapse: collapse !important;
        }

        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }

        thead {
          display: table-header-group;
        }

        tfoot {
          display: table-footer-group;
        }

        .print-avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        body[data-sbts-print-mode="certificate"] .certificate-page table,
        body[data-sbts-print-mode="certificate-package"] .certificate-page table,
        body[data-sbts-print-mode="report"] table {
          font-size: 10px !important;
        }

        body[data-sbts-print-mode="tag"] .tag-card,
        body[data-sbts-print-mode="tag-register"] .tag-card {
          display: block !important;
        }
      }

      @page sbtsCertificatePage {
        size: A4 portrait;
        margin: 0.6cm;
      }

      @page sbtsReportPage {
        size: A4 portrait;
        margin: 0.8cm;
      }

      @page sbtsTagPage {
        size: 11cm 7cm;
        margin: 0;
      }

      @page {
        size: A4 portrait;
        margin: 0.8cm;
      }
    `}</style>
  );
}
