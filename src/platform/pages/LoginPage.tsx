import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/platform/state/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, setError } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await login({ email, password });
      navigate("/platform/app/overview");
    } catch {
      // handled in context
    }
  }

  return (
    <div className="platform-auth-page">
      <section className="platform-auth-hero">
        <p className="platform-auth-eyebrow">AeroConcierge Platform</p>
        <h1>Welcome back.</h1>
        <p>Login to manage your tenant chatbot, theme, DNS verification, and knowledge base.</p>
      </section>

      <section className="platform-auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="platform-form-grid">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required />
          </label>

          <label>
            Password
            <div className="platform-password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                required
              />
              <button
                type="button"
                className="platform-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? <p className="platform-error">{error}</p> : null}

          <button className="platform-primary-btn" type="submit" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>

        <p className="platform-auth-footnote">
          Need an account? <Link to="/platform/signup">Create one</Link>
        </p>
      </section>
    </div>
  );
}
