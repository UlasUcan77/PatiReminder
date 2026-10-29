import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { errorMessage } from "../lib/format";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { user, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    try {
      const auth =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({
              name: String(form.get("name")),
              email,
              password,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
      signIn(auth);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="card stack" onSubmit={onSubmit}>
        <h1>
          Pati<span style={{ color: "var(--accent)" }}>Reminder</span>
        </h1>
        <p className="muted">Aşıları ve ilaçları ailecek takip edin.</p>
        {mode === "register" && (
          <label>
            Adınız
            <input name="name" required autoComplete="given-name" />
          </label>
        )}
        <label>
          E-posta
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Şifre
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {mode === "login" ? "Giriş yap" : "Hesap oluştur"}
        </button>
        <p className="small muted">
          {mode === "login" ? (
            <>
              Hesabınız yok mu? <Link to="/kayit">Kayıt olun</Link>
            </>
          ) : (
            <>
              Zaten hesabınız var mı? <Link to="/giris">Giriş yapın</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
