import { useState } from "react";
import { ArrowRight, FileText, Globe2, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

type WorkspaceSetupMode = "scratch" | "seeded";

type WorkspaceCreateFormProps = {
  variant?: "first" | "inline";
  defaultMode?: WorkspaceSetupMode;
  onCancel?: () => void;
  onCreated?: () => void;
};

function splitDocUrls(input: string): string[] {
  return input
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function WorkspaceCreateForm({
  variant = "first",
  defaultMode = "scratch",
  onCancel,
  onCreated
}: WorkspaceCreateFormProps) {
  const navigate = useNavigate();
  const { createWorkspace, loading, error, setError } = usePlatformAuth();

  const [setupMode, setSetupMode] = useState<WorkspaceSetupMode>(defaultMode);
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [docUrls, setDocUrls] = useState("");
  const [faqText, setFaqText] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    try {
      if (setupMode === "scratch") {
        await createWorkspace({
          company_name: companyName,
          setup_mode: "scratch"
        });
      } else {
        await createWorkspace({
          company_name: companyName,
          setup_mode: "seeded",
          website_url: websiteUrl,
          sitemap_url: sitemapUrl || undefined,
          doc_urls: splitDocUrls(docUrls),
          faq_text: faqText || undefined
        });
      }
      if (onCreated) {
        onCreated();
      } else {
        navigate("/platform/app/site-setup");
      }
    } catch {
      // handled in context
    }
  }

  const showSeedFields = setupMode === "seeded";
  const submitLabel = setupMode === "scratch" ? "Create project" : "Create and seed project";

  return (
    <div className="space-y-6">
      {variant === "first" ? (
        <div className="app-page-header">
          <div>
            <p className="app-kicker">First Project</p>
            <h2 className="app-h1">Create your first project</h2>
            <p className="app-lead">
              Start with only a project name, then complete domain, DNS, and knowledge setup from Setup & Content.
            </p>
          </div>
        </div>
      ) : null}

      {variant === "first" ? (
        <div className="app-stat-grid">
          <div className="app-stat-card teal">
            <p className="stat-label">Step 1</p>
            <p className="stat-value">Project</p>
            <p className="stat-desc">Create an empty project shell.</p>
          </div>
          <div className="app-stat-card gold">
            <p className="stat-label">Step 2</p>
            <p className="stat-value">Setup</p>
            <p className="stat-desc">Add domain, DNS, and content sources next.</p>
          </div>
        </div>
      ) : null}

      <section className="app-card">
        <p className="app-card-subtitle">Project Setup</p>
        <h3 className="app-card-title">Create a new project</h3>

        <form onSubmit={handleSubmit} className="app-form-grid">
          <fieldset className="col-span-full border-0 p-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0a0a0f]/45">
              Setup path
            </legend>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Choose setup path">
              {[
                {
                  id: "scratch" as const,
                  title: "Start from scratch",
                  description: "Create the project now and fill Setup & Content next.",
                  icon: Sparkles
                },
                {
                  id: "seeded" as const,
                  title: "Seed from website",
                  description: "Create with an initial domain and content sources.",
                  icon: Globe2
                }
              ].map((option) => {
                const selected = setupMode === option.id;
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSetupMode(option.id)}
                    className={`flex min-h-[112px] items-start gap-3 rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-[#1a5c5c]/35 bg-[#1a5c5c]/[0.06] shadow-sm"
                        : "border-[#0a0a0f]/08 bg-white hover:border-[#1a5c5c]/25 hover:bg-[#1a5c5c]/[0.03]"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                        selected ? "bg-[#1a5c5c] text-white" : "bg-[#faf8f4] text-[#0a0a0f]/58"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.9} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#0a0a0f]">{option.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#0a0a0f]/52">{option.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label>
            <span>Project name</span>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Business Class Booking Hub"
              required
            />
          </label>

          {showSeedFields ? (
            <>
              <label>
                <span>Website URL</span>
                <input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://yourdomain.com"
                  required={showSeedFields}
                  type="url"
                />
              </label>

              <label>
                <span>Sitemap URL</span>
                <input
                  value={sitemapUrl}
                  onChange={(event) => setSitemapUrl(event.target.value)}
                  placeholder="https://yourdomain.com/sitemap.xml"
                  type="url"
                />
              </label>

              <label className="col-span-full">
                <span>Doc URLs</span>
                <textarea
                  rows={4}
                  value={docUrls}
                  onChange={(event) => setDocUrls(event.target.value)}
                  placeholder={"https://yourdomain.com/refund\nhttps://yourdomain.com/policy"}
                />
              </label>

              <label className="col-span-full">
                <span>FAQs / support text</span>
                <textarea
                  rows={6}
                  value={faqText}
                  onChange={(event) => setFaqText(event.target.value)}
                  placeholder="Paste your FAQ and support text"
                />
              </label>
            </>
          ) : (
            <div className="col-span-full rounded-xl border border-[#1a5c5c]/15 bg-[#1a5c5c]/[0.04] px-4 py-3 text-sm text-[#1a5c5c]">
              <span className="inline-flex items-center gap-2 font-semibold">
                <FileText size={16} aria-hidden />
                Setup & Content will open after creation.
              </span>
            </div>
          )}

          {error ? (
            <div className="col-span-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="col-span-full rounded-xl border border-[#1a5c5c]/20 bg-[#1a5c5c]/[0.04] px-4 py-3 text-sm text-[#1a5c5c]">
              Creating project.
            </div>
          ) : null}

          <div className="col-span-full app-action-row">
            <button className="app-btn-primary" type="submit" disabled={loading}>
              <Plus size={16} aria-hidden />
              {loading ? "Creating project..." : submitLabel}
            </button>
            {onCancel ? (
              <button className="app-btn-secondary" type="button" onClick={onCancel}>
                Cancel
              </button>
            ) : null}
            <span className="inline-flex items-center gap-1 text-xs text-[#0a0a0f]/45">
              <ArrowRight size={14} aria-hidden />
              Site Setup
            </span>
          </div>
        </form>
      </section>
    </div>
  );
}
