import { useEffect, useState } from "react";
import type { PlatformService } from "@/platform/types";
import { usePlatformAuth } from "@/platform/state/auth";

const services: PlatformService[] = ["flights", "hotels", "cars", "cruises"];

export default function CustomizationPage() {
  const { selectedTenant, updateTenantProfile, loading, error, setError } = usePlatformAuth();
  const profile = selectedTenant?.business_profile;

  const [businessType, setBusinessType] = useState(profile?.business_type || "general_travel");
  const [supportedServices, setSupportedServices] = useState<PlatformService[]>(
    profile?.supported_services || ["flights"]
  );
  const [supportPhone, setSupportPhone] = useState(profile?.support_phone || "");
  const [supportEmail, setSupportEmail] = useState(profile?.support_email || "");
  const [supportCtaLabel, setSupportCtaLabel] = useState(profile?.support_cta_label || "Connect with a specialist");
  const [businessDescription, setBusinessDescription] = useState(profile?.business_description || "");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!profile) {
      return;
    }

    setBusinessType(profile.business_type || "general_travel");
    setSupportedServices(profile.supported_services || ["flights"]);
    setSupportPhone(profile.support_phone || "");
    setSupportEmail(profile.support_email || "");
    setSupportCtaLabel(profile.support_cta_label || "Connect with a specialist");
    setBusinessDescription(profile.business_description || "");
  }, [profile]);

  if (!selectedTenant) {
    return <section className="platform-panel"><p>Select a tenant to configure chatbot behavior.</p></section>;
  }

  const tenantId = selectedTenant.tenant_id;

  function toggleService(service: PlatformService) {
    setSupportedServices((previous) => {
      if (previous.includes(service)) {
        const next = previous.filter((item) => item !== service);
        return next.length > 0 ? next : ["flights"];
      }
      return [...previous, service];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSuccess("");
    setError("");

    try {
      await updateTenantProfile({
        tenant_id: tenantId,
        business_type: businessType,
        supported_services: supportedServices,
        support_phone: supportPhone || undefined,
        support_email: supportEmail || undefined,
        support_cta_label: supportCtaLabel,
        business_description: businessDescription || undefined
      });

      setSuccess("Customization saved.");
    } catch {
      // handled by context
    }
  }

  return (
    <section className="platform-panel">
      <h2>Customization</h2>
      <p>Define business profile, enabled services, and call CTA details for your chatbot.</p>

      <form onSubmit={handleSubmit} className="platform-form-grid two-col">
        <label>
          Business type
          <input value={businessType} onChange={(event) => setBusinessType(event.target.value)} />
        </label>

        <label>
          Support phone
          <input value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} placeholder="+1..." />
        </label>

        <label>
          Support email
          <input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} placeholder="support@company.com" />
        </label>

        <label>
          CTA label
          <input value={supportCtaLabel} onChange={(event) => setSupportCtaLabel(event.target.value)} />
        </label>

        <label className="full">
          Business description
          <textarea rows={4} value={businessDescription} onChange={(event) => setBusinessDescription(event.target.value)} />
        </label>

        <div className="full">
          <span className="label-inline">Enabled services</span>
          <div className="chip-row">
            {services.map((service) => (
              <button
                key={service}
                type="button"
                className={supportedServices.includes(service) ? "chip active" : "chip"}
                onClick={() => toggleService(service)}
              >
                {service}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="platform-error full">{error}</p> : null}
        {success ? <p className="platform-success full">{success}</p> : null}

        <button className="platform-primary-btn" disabled={loading} type="submit">
          {loading ? "Saving..." : "Save customization"}
        </button>
      </form>
    </section>
  );
}
