import { useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

export default function AccountPage() {
  const navigate = useNavigate();
  const { profile, logout } = usePlatformAuth();

  return (
    <section className="platform-panel">
      <h2>Account</h2>
      <p>Manage workspace access and session.</p>

      <div className="kpi-grid">
        <article>
          <span>Name</span>
          <strong>{profile?.user.full_name || "N/A"}</strong>
        </article>
        <article>
          <span>Email</span>
          <strong>{profile?.user.email || "N/A"}</strong>
        </article>
        <article>
          <span>Tenants</span>
          <strong>{profile?.tenants.length || 0}</strong>
        </article>
      </div>

      <button
        className="platform-primary-btn"
        type="button"
        onClick={() => {
          logout();
          navigate("/platform/login");
        }}
      >
        Logout
      </button>
    </section>
  );
}
