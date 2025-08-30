import { type FormEvent, useState } from "react";
import { api } from "../api";
import { useAuthStore } from "../store";

export default function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      setAuth(res.data.token, res.data.user);
      location.href = "/";
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420 }}>
        <h1>Login</h1>
        <form onSubmit={onSubmit} className="col gap">
          <label className="col">
            <span>Email</span>
            <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </label>
          <label className="col">
            <span>Password</span>
            <input className="input" type="password" value={password} onChange={(e)=>setPw(e.target.value)} required />
          </label>
          {err && <div className="error">{err}</div>}
          <button className="btn" disabled={loading}>{loading ? "..." : "Login"}</button>
        </form>
        <p className="muted">Don't have an account? Register via Swagger / Postman (endpoint /api/auth/register) for dev.</p>
      </div>
    </div>
  );
}
