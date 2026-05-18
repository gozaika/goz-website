"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@gozaika/utils";

type CopyState = "idle" | "copied" | "error";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Clipboard is unavailable.");
  }
}

function CopyButton({
  text,
  label,
  copiedLabel,
  className,
}: {
  readonly text: string;
  readonly label: string;
  readonly copiedLabel: string;
  readonly className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");

  async function onCopy() {
    try {
      await copyText(text);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#1A5C38]/25 px-3 text-sm font-semibold text-[#1A5C38] transition hover:border-[#1A5C38] hover:bg-[#EAF3DE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A5C38]",
        className,
      )}
    >
      {state === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {state === "copied" ? copiedLabel : state === "error" ? "Copy failed" : label}
    </button>
  );
}

export function DropShareActions({
  publicUrl,
  shareText,
  className,
}: {
  readonly publicUrl: string;
  readonly shareText?: string;
  readonly className?: string;
}) {
  const [shareState, setShareState] = useState<CopyState>("idle");

  async function onShare() {
    const payload = { title: "goZaika BAM Bag", text: shareText, url: publicUrl };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      await copyText(publicUrl);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2200);
    } catch {
      setShareState("error");
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <CopyButton text={publicUrl} label="Copy link" copiedLabel="Link copied" />
      <button
        type="button"
        onClick={onShare}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#1A5C38] px-3 text-sm font-semibold text-white transition hover:bg-[#13452A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B35]"
      >
        <Share2 size={16} aria-hidden="true" />
        {shareState === "copied" ? "Link copied" : shareState === "error" ? "Share failed" : "Share"}
      </button>
    </div>
  );
}

export function LaunchCommsPanel({
  publicUrl,
  alertText,
  title = "Manual launch comms",
  compact = false,
}: {
  readonly publicUrl: string;
  readonly alertText: string;
  readonly title?: string;
  readonly compact?: boolean;
}) {
  return (
    <section className={cn("rounded-md border border-[#1A5C38]/20 bg-[#F7FBF3] p-3", compact ? "text-xs" : "text-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-[#1A5C38]">{title}</h3>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={publicUrl} label="Copy link" copiedLabel="Link copied" className="min-h-9 px-2 text-xs" />
          <CopyButton text={alertText} label="Copy alert" copiedLabel="Alert copied" className="min-h-9 px-2 text-xs" />
        </div>
      </div>
      <textarea
        readOnly
        value={alertText}
        className="mt-3 min-h-40 w-full resize-y rounded-md border border-[#1A5C38]/20 bg-white p-3 font-mono text-xs leading-5 text-[#2D2D2D]"
        aria-label="Generated WhatsApp alert preview"
      />
    </section>
  );
}
