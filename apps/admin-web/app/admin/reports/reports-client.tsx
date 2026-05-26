"use client";

import { Button } from "@gozaika/ui";
import type { RoiReportPayload } from "@gozaika/types";
import { Copy, Download } from "lucide-react";
import { useState } from "react";

function partnerText(report: RoiReportPayload): string {
  return [
    `${report.partnerCopy.title}: ${report.partnerCopy.restaurantName}`,
    `Period: ${report.partnerCopy.periodLabel}`,
    "",
    ...report.partnerCopy.summaryLines,
    "",
    "Assumptions:",
    ...report.partnerCopy.assumptionLines.map((line) => `- ${line}`),
    "",
    "Next actions:",
    ...report.partnerCopy.nextActionLines.map((line) => `- ${line}`),
    "",
    `Generated: ${new Date(report.partnerCopy.generatedAt).toLocaleString("en-IN")}`,
  ].join("\n");
}

export function AdminReportsCopyPanel({ report }: { readonly report: RoiReportPayload }) {
  const [message, setMessage] = useState("");
  const text = partnerText(report);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Partner-safe report copied.");
    } catch {
      setMessage("Could not copy report text.");
    }
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gozaika-roi-report-${report.summary.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Partner-safe report text downloaded.");
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Partner-safe report text</h2>
          <p className="mt-1 text-sm text-slate-600">No consumer contact data, provider payloads, pickup credentials, private documents, or internal notes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="bg-[#1A5C38] hover:bg-[#154b2e]" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            Copy
          </Button>
          <Button type="button" className="bg-white text-[#1A5C38] ring-1 ring-[#1A5C38]/25 hover:bg-[#F2F8EF]" onClick={download}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download
          </Button>
        </div>
      </div>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-black/[0.03] p-3 text-xs leading-5 text-slate-800">
        {text}
      </pre>
      {message ? <p className="mt-3 rounded-md border border-[#D4A017]/40 bg-[#FFF8E6] px-3 py-2 text-sm font-medium">{message}</p> : null}
    </section>
  );
}
