import { useEffect, useMemo, useState } from "react";
import { platformGetVisitorContacts } from "@/lib/platformApi";
import WorkspaceCreateForm from "@/platform/components/WorkspaceCreateForm";
import { usePlatformAuth } from "@/platform/state/auth";
import type { PlatformVisitorContact } from "@/platform/types";

const PAGE_SIZE = 25;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function LeadsPage() {
  const { selectedTenant, token } = usePlatformAuth();
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [contacts, setContacts] = useState<PlatformVisitorContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const latestCapturedAt = useMemo(() => {
    if (contacts.length === 0) {
      return "No captures yet";
    }
    return formatDateTime(contacts[0].captured_at);
  }, [contacts]);

  useEffect(() => {
    if (!token || !selectedTenant?.tenant_id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    platformGetVisitorContacts(token, {
      tenantId: selectedTenant.tenant_id,
      query: query.trim() || undefined,
      limit: PAGE_SIZE,
      offset
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setContacts(result.contacts);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load captured users");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [offset, query, selectedTenant?.tenant_id, token]);

  if (!selectedTenant) {
    return <WorkspaceCreateForm />;
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#a07840]">
            <span className="h-px w-5 bg-[#c9a96e]" /> Lead Capture
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-light text-[#0a0a0f] sm:text-3xl">
            Captured Users
          </h2>
          <p className="mt-1 text-sm text-[#0a0a0f]/55">
            Contact details collected from chatbot conversations for this workspace.
          </p>
        </div>

        <div className="w-full md:w-[320px]">
          <input
            className="app-input"
            value={query}
            onChange={(event) => {
              setOffset(0);
              setQuery(event.target.value);
            }}
            placeholder="Search name, email, phone"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#0a0a0f]/8 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a0a0f]/45">
            Total Captured
          </p>
          <strong className="mt-2 block font-[family-name:var(--font-display)] text-4xl font-light text-[#0a0a0f]">
            {total}
          </strong>
        </div>
        <div className="rounded-2xl border border-[#0a0a0f]/8 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a0a0f]/45">
            Latest Capture
          </p>
          <strong className="mt-2 block text-lg font-semibold text-[#0a0a0f]">{latestCapturedAt}</strong>
        </div>
      </div>

      <section className="rounded-2xl border border-[#0a0a0f]/8 bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-[#0a0a0f]/55">Loading captured users...</p> : null}
        {error ? <p className="app-error">{error}</p> : null}

        {!loading && !error && contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#c9a96e]/40 bg-[#fffaf1] px-5 py-8 text-center">
            <p className="text-sm font-semibold text-[#a07840]">No captured users yet</p>
            <p className="mt-1 text-sm text-[#0a0a0f]/50">
              Visitor details will appear here after the chatbot collects contact information.
            </p>
          </div>
        ) : null}

        {!loading && !error && contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#0a0a0f]/10 text-xs uppercase tracking-wider text-[#0a0a0f]/50">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Captured At</th>
                  <th className="px-3 py-2">Chat ID</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-[#0a0a0f]/6">
                    <td className="px-3 py-2 font-medium text-[#0a0a0f]">{contact.full_name}</td>
                    <td className="px-3 py-2 text-[#0a0a0f]/70">{contact.email}</td>
                    <td className="px-3 py-2 text-[#0a0a0f]/70">{contact.phone}</td>
                    <td className="px-3 py-2 text-[#0a0a0f]/60">{formatDateTime(contact.captured_at)}</td>
                    <td className="px-3 py-2 text-[12px] text-[#0a0a0f]/45">{contact.chat_id || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && total > PAGE_SIZE ? (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-[#0a0a0f]/55">
              Showing {pageStart}-{pageEnd} of {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="app-btn-secondary"
                disabled={offset === 0}
                onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              >
                Previous
              </button>
              <button
                type="button"
                className="app-btn-secondary"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
