import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/AppShell";
import { Check, FileText, Upload, ShieldCheck, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/kyc")({
  head: () => ({ meta: [{ title: "KYC · Bombay Silvers" }] }),
  component: KYC,
});

type KycDocType =
  | "pan_card"
  | "gst_certificate"
  | "business_registration"
  | "address_proof"
  | "bank_statement"
  | "cancelled_cheque"
  | "other";

type KycDocumentRow = {
  id: string;
  document_type: KycDocType;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  status: "pending" | "processing" | "verified" | "rejected";
  created_at: string;
};

const REQUIRED_DOCS: Array<{ type: KycDocType; name: string; hint: string }> = [
  { type: "pan_card", name: "PAN Card", hint: "Permanent Account Number" },
  { type: "gst_certificate", name: "GST Certificate", hint: "GSTIN registration" },
  {
    type: "business_registration",
    name: "Business registration",
    hint: "Certificate of incorporation / Shops Act",
  },
  { type: "address_proof", name: "Address proof", hint: "Electricity bill or lease deed" },
  { type: "bank_statement", name: "Bank statement", hint: "Last 6 months" },
  { type: "cancelled_cheque", name: "Cancelled cheque", hint: "For payout verification" },
];

function KYC() {
  const navigate = useNavigate();
  const { dealer, user } = useAuth();
  const [docs, setDocs] = useState<Record<string, KycDocumentRow>>({});
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const fileInputRef = useRef<{ docType: KycDocType; input: HTMLInputElement | null }>({
    docType: "pan_card",
    input: null,
  });

  const loadDocs = useCallback(async () => {
    if (!dealer) return;
    setLoadingDocs(true);
    const { data, error } = await supabase
      .from("kyc_documents")
      .select("*")
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const map: Record<string, KycDocumentRow> = {};
      for (const row of data as unknown as KycDocumentRow[]) {
        map[row.document_type] = row;
      }
      setDocs(map);
    }
    setLoadingDocs(false);
  }, [dealer]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const beginUpload = (docType: string) => {
    fileInputRef.current.docType = docType as KycDocType;
    fileInputRef.current.input?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const { docType } = fileInputRef.current;
    event.target.value = "";
    if (!file) return;
    if (!user || !dealer) {
      toast.error("Please sign in again to upload documents.");
      return;
    }
    if (!["pdf", "jpg", "jpeg", "png"].includes(file.name.split(".").pop()?.toLowerCase() ?? "")) {
      toast.error("Only PDF, JPG or PNG files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Files must be under 10 MB.");
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
    setUploading(docType);
    try {
      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("kyc_documents").insert({
        dealer_id: dealer.id,
        document_type: docType,
        file_url: path,
        file_name: file.name,
        file_size_bytes: file.size,
        status: "pending",
      });
      if (insertError) throw insertError;

      toast.success("Document uploaded. It will be reviewed by compliance.");
      await loadDocs();
    } catch (error) {
      console.error("[kyc] upload failed:", error);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to upload the document. Please try again.",
      );
    } finally {
      setUploading(null);
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    await supabase.auth.updateUser({ data: { kyc_status: "skipped" } });
    setSkipping(false);
    navigate({ to: "/dashboard" });
  };

  const handleSubmit = async () => {
    const uploaded = REQUIRED_DOCS.filter((d) => docs[d.type]).length;
    if (uploaded < REQUIRED_DOCS.length) {
      toast.error(`Upload ${REQUIRED_DOCS.length - uploaded} more document(s) before submitting.`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ data: { kyc_status: "submitted" } });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Documents submitted for review.");
    navigate({ to: "/dashboard" });
  };

  const verified = Object.values(docs).filter((d) => d.status === "verified").length;
  const docState = (type: string) => docs[type];
  const uploaded = REQUIRED_DOCS.filter((d) => docs[d.type]).length;

  return (
    <div className="min-h-screen overflow-x-hidden p-3 pb-24 sm:p-8 sm:pb-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
          <BrandMark />
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-[var(--surface-2)] px-3 py-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--gain)]" /> Bank-grade encryption
          </span>
        </div>

        <div className="glass rounded-2xl p-2.5 sm:rounded-3xl sm:p-8">
          <div className="flex items-start justify-between gap-4 sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  KYC & documents
                </div>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground sm:hidden">
                  {verified}/{REQUIRED_DOCS.length} verified
                </span>
              </div>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight sm:mt-2 sm:text-2xl">
                {loadingDocs ? "Loading documents…" : "Upload your statutory documents"}
              </h1>
              <p className="mt-1 max-w-lg text-xs text-muted-foreground sm:text-sm">
                <span className="sm:hidden">Upload PDF, JPG or PNG, up to 10 MB each.</span>
                <span className="hidden sm:inline">
                  Upload PDF, JPG or PNG up to 10 MB each. Files are encrypted at rest and only
                  accessible by compliance officers.
                </span>
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <div className="metallic-text font-mono text-2xl font-semibold">
                {verified} / {REQUIRED_DOCS.length}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                verified
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-8">
            {/* Desktop: full-width rows with hint + action */}
            <div className="hidden space-y-3 sm:block">
              {REQUIRED_DOCS.map((d) => {
                const row = docState(d.type);
                const status = row?.status ?? (row ? "uploaded" : "pending");
                return (
                  <div
                    key={d.type}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border/60 bg-[var(--surface-2)]/70 p-4"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)]">
                      <FileText className="h-5 w-5 text-[var(--platinum)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.name}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {row?.file_name ?? d.hint}
                        {row?.file_size_bytes != null
                          ? ` · ${(row.file_size_bytes / 1024).toFixed(0)} KB`
                          : ""}
                      </div>
                    </div>
                    {status === "verified" ? (
                      <StatusPill status="verified" />
                    ) : status === "processing" ? (
                      <StatusPill status="processing" />
                    ) : (
                      <button
                        onClick={() => beginUpload(d.type)}
                        disabled={uploading === d.type}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 py-1.5 text-xs hover:bg-[var(--surface-3)] disabled:opacity-50"
                      >
                        {uploading === d.type ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {row?.status === "rejected" ? "Re-upload" : row ? "Upload again" : "Upload"}
                      </button>
                    )}
                    <input
                      ref={(el) => {
                        fileInputRef.current.input = el;
                      }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                  </div>
                );
              })}
            </div>

            {/* Mobile: compact 2-column tiles */}
            <div className="grid grid-cols-2 gap-1.5 sm:hidden">
              {REQUIRED_DOCS.map((d) => {
                const row = docState(d.type);
                const status = row?.status ?? (row ? "uploaded" : "pending");
                return (
                  <div
                    key={d.type}
                    className="rounded-xl border border-border/60 bg-[var(--surface-2)]/70 p-1.5"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--surface-3)]">
                        <FileText className="h-3 w-3 text-[var(--platinum)]" />
                      </div>
                      {status === "verified" ? (
                        <StatusPill status="verified" />
                      ) : status === "processing" ? (
                        <StatusPill status="processing" />
                      ) : null}
                    </div>
                    <div className="mt-1 truncate text-xs font-medium leading-tight" title={d.name}>
                      {d.name}
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {row
                        ? row.file_name
                          ? `${row.file_name}${row.file_size_bytes != null ? ` · ${(row.file_size_bytes / 1024).toFixed(0)} KB` : ""}`
                          : d.hint
                        : ""}
                    </div>
                    {status !== "verified" && status !== "processing" && (
                      <button
                        onClick={() => beginUpload(d.type)}
                        disabled={uploading === d.type}
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-border/70 bg-[var(--surface-2)] px-2 py-1 text-[11px] hover:bg-[var(--surface-3)] disabled:opacity-50"
                      >
                        {uploading === d.type ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        {row?.status === "rejected" ? "Re-upload" : row ? "Replace" : "Upload"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop: drop zone hint */}
          <div className="mt-6 hidden rounded-2xl border border-dashed border-border/70 bg-[var(--surface-2)]/40 p-6 text-center sm:block">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[var(--surface-3)]">
              <Upload className="h-5 w-5 text-[var(--platinum)]" />
            </div>
            <div className="mt-3 text-sm">Click Upload on any row above to attach a document</div>
            <div className="mt-1 text-xs text-muted-foreground">
              PDF, JPG, PNG · up to 10 MB each
            </div>
          </div>

          {/* Skip for now notice */}
          <div className="mt-4 rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/8 p-3 sm:mt-6 sm:p-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--warn)]">
                  KYC required for major features
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  <span className="sm:hidden">
                    Orders, ledger, invoices & referrals unlock after KYC. Complete anytime from
                    Settings.
                  </span>
                  <span className="hidden sm:inline">
                    Without KYC, you can browse the terminal but <strong>cannot</strong> place
                    orders, view the ledger, download invoices, or access the referral programme.
                    You can complete KYC anytime from Settings.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: in-card action bar */}
          <div className="mt-8 hidden items-center justify-between border-t border-border/60 pt-6 sm:flex">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-[var(--gain)]" />
                {uploaded} / {REQUIRED_DOCS.length} documents uploaded
              </div>
              <button
                onClick={handleSkip}
                disabled={skipping}
                className="flex items-center gap-1.5 rounded-lg border border-border/70 px-3 py-2 text-xs text-muted-foreground hover:bg-[var(--surface-2)] hover:text-foreground disabled:opacity-60"
              >
                {skipping ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                Skip for now
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || uploaded < REQUIRED_DOCS.length}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-5 py-2.5 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Submit for review <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-[var(--surface-1)]/95 p-3 backdrop-blur-sm sm:hidden">
        <div className="mx-auto flex max-w-sm items-center gap-2">
          <button
            onClick={handleSkip}
            disabled={skipping}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/70 px-4 py-3 text-sm text-muted-foreground hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] disabled:opacity-60"
          >
            {skipping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploaded < REQUIRED_DOCS.length}
            className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-4 py-3 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Submit for review <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
        <div className="mx-auto mt-1.5 max-w-sm text-center text-[11px] text-muted-foreground">
          <Check className="mr-1 inline h-3 w-3 text-[var(--gain)]" />
          {uploaded} / {REQUIRED_DOCS.length} documents uploaded
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    verified: {
      c: "text-[var(--gain)] border-[var(--gain)]/30 bg-[var(--gain)]/10",
      label: "Verified",
    },
    processing: {
      c: "text-[var(--warn)] border-[var(--warn)]/30 bg-[var(--warn)]/10",
      label: "Processing",
    },
    pending: {
      c: "text-muted-foreground border-border/60 bg-[var(--surface-3)]",
      label: "Pending",
    },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] " + s.c
      }
    >
      {status === "verified" && <Check className="h-3 w-3" />}
      {s.label}
    </span>
  );
}
