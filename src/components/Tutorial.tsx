import { useState } from "react";
import { Languages, Info, ChevronRight, ChevronLeft, X, Check } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { LANGUAGES } from "@/lib/i18n";

const STEPS = [
  {
    icon: Info,
    title: (t: (k: string, f?: string) => string) => t("tut.welcomeTitle", "Welcome to Bombay Silvers"),
    body: (t: (k: string, f?: string) => string) =>
      t(
        "tut.welcomeBody",
        "This tour walks you through the terminal in about 60 seconds. Use Next to continue.",
      ),
  },
  {
    icon: Languages,
    title: (t: (k: string, f?: string) => string) => t("tut.langTitle", "Choose your language"),
    body: (t: (k: string, f?: string) => string) =>
      t(
        "tut.langBody",
        "Tap the language menu to switch between 9 Indian languages. Your choice is remembered on this device.",
      ),
  },
];

export function LanguageMenuButton({ onOpenTutorial }: { onOpenTutorial: () => void }) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-[var(--surface-2)] px-2.5 text-xs hover:bg-[var(--surface-3)]"
        title={t("app.language")}
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="font-mono uppercase">{current?.native ?? "En"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border/70 bg-[var(--surface-1)] shadow-xl">
            <div className="max-h-72 overflow-y-auto p-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground hover:bg-[var(--surface-2)]"
                >
                  <span className="font-medium">{l.native}</span>
                  <span className="text-[11px] text-muted-foreground">{l.label}</span>
                  {l.code === lang && <Check className="h-3.5 w-3.5 text-[var(--gain)]" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setOpen(false);
                onOpenTutorial();
              }}
              className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-2 text-xs text-foreground hover:bg-[var(--surface-2)]"
            >
              <Info className="h-3.5 w-3.5" /> {t("app.tutorial")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TutorialDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  if (!open) return null;
  const total = STEPS.length;
  const cur = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border/70 bg-[var(--surface-1)] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-[var(--surface-2)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-3)]">
          <cur.icon className="h-6 w-6 text-[var(--platinum)]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{cur.title(t)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{cur.body(t)}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={
                  "h-1.5 w-6 rounded-full " + (i === step ? "bg-[var(--platinum)]" : "bg-[var(--surface-3)]")
                }
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex h-9 items-center gap-1 rounded-lg border border-border/70 bg-[var(--surface-2)] px-3 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {t("tut.prev", "Back")}
            </button>
            {step < total - 1 ? (
              <button
                onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                className="flex h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-3 text-xs font-medium text-black"
              >
                {t("tut.next", "Next")} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-[#f1f1f4] to-[#b6b7bb] px-3 text-xs font-medium text-black"
              >
                <Check className="h-3.5 w-3.5" /> {t("tut.done", "Done")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}