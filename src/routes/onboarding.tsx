import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "@/components/AppShell";
import { Check, ArrowRight, ArrowLeft, Loader2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEMO_MODE, demoGetOtp } from "@/lib/auth-fns";
import { cleanDigits, isValidEmail, isValidIndianMobile } from "@/lib/validate";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Dealer Application · Bombay Silvers" }] }),
  component: Onboarding,
});

// ─── Static data ─────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  "Proprietary Firm",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "HUF",
  "Trust / NGO",
  "Other",
];

const PRIMARY_METALS = [
  "Silver 999",
  "Silver 925 (Sterling)",
  "Gold 999 / 24K",
  "Gold 995",
  "Gold 22K Coins",
  "Gold 18K Jewellery",
  "Platinum",
  "Mixed / All metals",
];

const YEARS_OPTIONS = [
  "Less than 1 year",
  "1–3 years",
  "3–5 years",
  "5–10 years",
  "10–20 years",
  "More than 20 years",
];

const TURNOVER_OPTIONS = [
  "Under ₹10 Lakh / month",
  "₹10L – ₹50L / month",
  "₹50L – ₹1 Crore / month",
  "₹1 Cr – ₹5 Cr / month",
  "₹5 Cr – ₹25 Cr / month",
  "Above ₹25 Crore / month",
];

const TXN_OPTIONS = [
  "1–10 transactions",
  "10–50 transactions",
  "50–200 transactions",
  "200–500 transactions",
  "500+ transactions",
];

const REFERRAL_OPTIONS = [
  "Existing Bombay Silvers dealer",
  "Trade show / exhibition",
  "Online search",
  "Social media",
  "Newspaper / magazine",
  "Bombay Silvers sales team",
  "Other",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi (NCT)",
  "Jammu & Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
  "Andaman & Nicobar Islands",
  "Dadra & Nagar Haveli",
  "Daman & Diu",
  "Lakshadweep",
];

// ─── Form state ───────────────────────────────────────────────────────────────

type FormData = {
  // Step 1 — Contact & Firm
  firmName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address: string;
  gstNumber: string;
  // Step 2 — Business profile
  businessType: string;
  primaryMetal: string;
  yearsInBusiness: string;
  monthlyTurnover: string;
  transactionsPerMonth: string;
  referralSource: string;
};

const EMPTY: FormData = {
  firmName: "",
  contactName: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  address: "",
  gstNumber: "",
  businessType: "",
  primaryMetal: "",
  yearsInBusiness: "",
  monthlyTurnover: "",
  transactionsPerMonth: "",
  referralSource: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kycSkipped, setKycSkipped] = useState(false);

  const set = (k: keyof FormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const steps = [
    { n: 1, label: "Contact & firm" },
    { n: 2, label: "Business profile" },
    { n: 3, label: "KYC & documents" },
    { n: 4, label: "Review & submit" },
  ];

  // ── Step validation ─────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.firmName.trim()) return "Firm name is required.";
    if (!form.contactName.trim()) return "Contact name is required.";
    if (!isValidIndianMobile(form.phone)) return "Enter a valid 10-digit mobile number.";
    if (!isValidEmail(form.email)) return "Enter a valid email address.";
    if (!form.state) return "Select a state.";
    return null;
  };

  const validateStep2 = () => {
    if (!form.businessType) return "Select a business type.";
    if (!form.primaryMetal) return "Select your primary metal.";
    if (!form.yearsInBusiness) return "Select years in business.";
    if (!form.monthlyTurnover) return "Select monthly turnover range.";
    return null;
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
    }
    setStep((s) => s + 1);
  };

  // ── Final submit: save draft to sessionStorage + send email OTP ─────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const cleaned = cleanDigits(form.phone);
    const fullPhone = `+91${cleaned}`;

    // Store draft for the OTP page to persist after verification
    const draft = {
      firm_name: form.firmName,
      contact_name: form.contactName,
      phone: fullPhone,
      email: form.email,
      city: form.city,
      state: form.state,
      address: form.address,
      gst_number: form.gstNumber,
      business_type: form.businessType,
      primary_metal: form.primaryMetal,
      years_in_business: form.yearsInBusiness,
      monthly_turnover: form.monthlyTurnover,
      transactions_per_month: form.transactionsPerMonth,
      referral_source: form.referralSource,
      kyc_status: kycSkipped ? "skipped" : "none",
      applied_at: new Date().toISOString(),
    };
    sessionStorage.setItem("dealer_draft", JSON.stringify(draft));

    // Send email OTP to create / verify the user
    let otpErr: string | null = null;
    let demoOtp: string | undefined;

    if (DEMO_MODE) {
      const res = await demoGetOtp({ data: { flow: "register", email: form.email } });
      if ("error" in res) {
        otpErr = res.error;
      } else {
        demoOtp = res.otp;
      }
    } else {
      const res = await supabase.auth.signInWithOtp({
        email: form.email,
        options: { shouldCreateUser: true },
      });
      otpErr = res.error?.message ?? null;
    }

    setLoading(false);
    if (otpErr) {
      setError(
        otpErr && otpErr !== "{}"
          ? otpErr
          : "We couldn't send a verification email to that address. Check the email and try again, or contact support.",
      );
      return;
    }

    if (demoOtp)
      sessionStorage.setItem(
        "demo_otp",
        JSON.stringify({ otp: demoOtp, flow: "register", email: form.email }),
      );

    navigate({
      to: "/otp",
      search: {
        email: form.email,
        phone: fullPhone,
        trust: true,
        flow: "register",
      },
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <BrandMark />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Application · Step {step} of 4
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Stepper */}
          <aside className="glass h-fit min-w-0 rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Progress
            </div>
            <div className="mt-4 space-y-1">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 " +
                    (s.n === step ? "bg-[var(--surface-3)]" : "")
                  }
                >
                  <div
                    className={
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs " +
                      (s.n < step
                        ? "bg-[var(--gain)]/20 text-[var(--gain)]"
                        : s.n === step
                          ? "bg-gradient-to-br from-[#e9e9ec] to-[#8b8c90] text-black"
                          : "border border-border bg-[var(--surface-2)] text-muted-foreground")
                    }
                  >
                    {s.n < step ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </div>
                  <span
                    className={
                      "text-sm " + (s.n <= step ? "text-foreground" : "text-muted-foreground")
                    }
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 p-3 text-[11px] text-muted-foreground">
              Applications reviewed within 2 business days. Our relationship manager will call you.
            </div>
          </aside>

          {/* Form section */}
          <section className="glass min-w-0 rounded-2xl p-6 sm:p-8">
            {error && (
              <div className="mb-6 rounded-lg border border-[var(--loss)]/30 bg-[var(--loss)]/10 px-4 py-3 text-sm text-[var(--loss)]">
                {error}
              </div>
            )}

            {step === 1 && (
              <Step1
                form={form}
                set={set}
                phoneError={
                  form.phone && !isValidIndianMobile(form.phone)
                    ? "Enter a valid 10-digit mobile number."
                    : null
                }
                emailError={
                  form.email && !isValidEmail(form.email) ? "Enter a valid email address." : null
                }
              />
            )}
            {step === 2 && <Step2 form={form} set={set} />}
            {step === 3 && (
              <Step3
                kycSkipped={kycSkipped}
                onSkip={() => {
                  setKycSkipped(true);
                  setStep(4);
                }}
              />
            )}
            {step === 4 && <Step4 form={form} kycSkipped={kycSkipped} />}

            {/* Nav */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-6">
              {step > 1 ? (
                <button
                  onClick={() => {
                    setStep((s) => s - 1);
                    setError(null);
                  }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <span />
              )}

              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-5 py-2.5 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-5 py-2.5 text-sm font-medium text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Submit & verify <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 — Contact & Firm ─────────────────────────────────────────────────

function Step1({
  form,
  set,
  phoneError,
  emailError,
}: {
  form: FormData;
  set: (k: keyof FormData, v: string) => void;
  phoneError: string | null;
  emailError: string | null;
}) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Step 1 of 4
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Contact & firm details</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Basic information about your firm and primary contact person.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <TextField
          label="Firm / Business name *"
          value={form.firmName}
          onChange={(v) => set("firmName", v)}
          placeholder="Mehta Bullion Traders"
        />
        <TextField
          label="Proprietor / Director name *"
          value={form.contactName}
          onChange={(v) => set("contactName", v)}
          placeholder="Rahul K. Mehta"
        />
        <TextField
          label="Mobile number *"
          value={form.phone}
          onChange={(v) => set("phone", cleanDigits(v).slice(0, 10))}
          placeholder="98765 43210"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          hint="+91 prefix added automatically"
          error={phoneError}
        />
        <TextField
          label="Email address *"
          value={form.email}
          onChange={(v) => set("email", v.trim())}
          placeholder="rahul@mehtabullion.in"
          type="email"
          error={emailError}
        />
        <TextField
          label="City"
          value={form.city}
          onChange={(v) => set("city", v)}
          placeholder="Surat"
        />
        <SelectField
          label="State *"
          value={form.state}
          onChange={(v) => set("state", v)}
          options={INDIAN_STATES}
          placeholder="Select state"
        />
        <div className="sm:col-span-2">
          <TextArea
            label="Registered / warehouse address"
            value={form.address}
            onChange={(v) => set("address", v)}
            placeholder="14, Zaveri Bazaar, Mahidharpura, Surat 395003"
          />
        </div>
        <TextField
          label="GST number"
          value={form.gstNumber}
          onChange={(v) => set("gstNumber", v)}
          placeholder="24AAECM1234K1Z9 (optional)"
        />
      </div>
    </>
  );
}

// ─── Step 2 — Business Profile ───────────────────────────────────────────────

function Step2({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Step 2 of 4
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Business profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Helps us set your credit limits and inventory access tier.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Business type *"
          value={form.businessType}
          onChange={(v) => set("businessType", v)}
          options={BUSINESS_TYPES}
          placeholder="Select type"
        />
        <SelectField
          label="Primary metal focus *"
          value={form.primaryMetal}
          onChange={(v) => set("primaryMetal", v)}
          options={PRIMARY_METALS}
          placeholder="Select metal"
        />
        <SelectField
          label="Years in business *"
          value={form.yearsInBusiness}
          onChange={(v) => set("yearsInBusiness", v)}
          options={YEARS_OPTIONS}
          placeholder="Select range"
        />
        <SelectField
          label="Monthly turnover (approx.) *"
          value={form.monthlyTurnover}
          onChange={(v) => set("monthlyTurnover", v)}
          options={TURNOVER_OPTIONS}
          placeholder="Select range"
        />
        <SelectField
          label="Transactions per month"
          value={form.transactionsPerMonth}
          onChange={(v) => set("transactionsPerMonth", v)}
          options={TXN_OPTIONS}
          placeholder="Select range"
        />
        <SelectField
          label="How did you hear about us?"
          value={form.referralSource}
          onChange={(v) => set("referralSource", v)}
          options={REFERRAL_OPTIONS}
          placeholder="Select"
        />
      </div>
    </>
  );
}

// ─── Step 3 — KYC ────────────────────────────────────────────────────────────

const KYC_DOCS = [
  "PAN Card (Firm or Proprietor)",
  "GST Registration Certificate",
  "Aadhaar / Passport (Proprietor)",
  "Bank statement — last 6 months",
  "Cancelled cheque / Bank letter",
  "Trade / Shop-act license",
];

function Step3({ kycSkipped, onSkip }: { kycSkipped: boolean; onSkip: () => void }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Step 3 of 4
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">KYC & documents</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Compliance is mandatory before you can place orders or access your ledger. You will upload
        each of the documents below in the next step — right after your email is verified — and they
        are reviewed within 2 business days. You can skip this now and complete it anytime.
      </p>

      <div className="mt-6 space-y-2">
        {KYC_DOCS.map((name) => (
          <div
            key={name}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-[var(--surface-2)]/60 px-4 py-3"
          >
            <FileText className="h-4 w-4 shrink-0 text-[var(--platinum)]" />
            <span className="flex-1 text-sm">{name}</span>
            <Check className="h-4 w-4 shrink-0 text-[var(--gain)]" />
          </div>
        ))}
      </div>

      {/* Skip option */}
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-border/60 bg-[var(--surface-2)]/40 p-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {kycSkipped
              ? "✓ Skipped — you can complete KYC anytime in the terminal"
              : "Skip KYC for now"}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            You'll still be able to browse the terminal, but placing orders, viewing the ledger, and
            downloading invoices require KYC.
          </div>
        </div>
        {!kycSkipped && (
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 rounded-lg border border-border/70 bg-[var(--surface-3)] px-3 py-1.5 text-xs hover:bg-[var(--surface-2)]"
          >
            Skip for now
          </button>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-[var(--warn)]/30 bg-[var(--warn)]/8 p-4 text-sm">
        Placing orders, viewing the ledger, downloading invoices, and the referral programme are
        only available after your KYC documents are uploaded and approved.
      </div>
    </>
  );
}

// ─── Step 4 — Review & Submit ─────────────────────────────────────────────────

function Step4({ form, kycSkipped }: { form: FormData; kycSkipped: boolean }) {
  const rows: Array<[string, string]> = [
    ["Firm name", form.firmName],
    ["Contact person", form.contactName],
    ["Mobile number", `+91 ${form.phone.replace(/\D/g, "")}`],
    ["Email", form.email],
    ["City / State", [form.city, form.state].filter(Boolean).join(", ")],
    ["Business type", form.businessType],
    ["Primary metal", form.primaryMetal],
    ["Years in business", form.yearsInBusiness],
    ["Monthly turnover", form.monthlyTurnover],
    [
      "KYC",
      kycSkipped
        ? "Skip for now — will complete later"
        : "To be submitted after email verification",
    ],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Step 4 of 4
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Review & submit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm your details. You'll receive a 6-digit verification code at{" "}
        <strong>{form.email}</strong>.
      </p>

      <div className="mt-8 divide-y divide-border/60 rounded-xl border border-border/60 bg-[var(--surface-2)]/40">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[160px_1fr] gap-3 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate font-medium">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border/60 bg-[var(--surface-2)]/40 p-4 text-xs text-muted-foreground">
        By submitting, you agree to Bombay Silvers' dealer terms and confirm that all information
        provided is accurate.
      </div>
    </>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  error,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  error?: string | null;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className={
          "h-11 w-full rounded-xl border bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--silver-muted)] " +
          (error ? "border-[var(--loss)]" : "border-border/70")
        }
      />
      {error ? (
        <p className="mt-1 text-[11px] text-[var(--loss)]">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--silver-muted)] resize-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border/70 bg-[var(--surface-2)] px-3 text-sm outline-none focus:border-[var(--silver-muted)] appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o} style={{ background: "#1a1b1e" }}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
