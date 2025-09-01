import { type FormEvent, useState } from "react";
import { api } from "../api";
import { useAuthStore } from "../store";
import { Mic } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VoiceGen</h1>
          <p className="text-gray-600 mt-2">Advanced Text-to-Speech Platform</p>
        </div>

        <form onSubmit={onSubmit} className="col gap">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              {/* <input
              type="email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter your email"
            /> */}
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              {/* <input
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter your password"
            /> */}
              <input
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                type="password"
                value={password}
                onChange={(e) => setPw(e.target.value)}
                required
              />
            </div>

            {/* <button
              onClick={handleLogin}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              Sign In
            </button> */}
            {err && <div className="error">{err}</div>}
            <button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? "..." : "Login"}
            </button>
          </div>
        </form>

        {/* <div className="mt-6 text-center text-sm text-gray-500">
          Demo credentials: any email and password
        </div> */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have an account? Register via Swagger / Postman (endpoint
          /api/auth/register) for dev.
        </div>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420 }}>
        <h1>Login</h1>
        <form onSubmit={onSubmit} className="col gap">
          <label className="col">
            <span>Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="col">
            <span>Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </label>
          {err && <div className="error">{err}</div>}
          <button className="btn" disabled={loading}>
            {loading ? "..." : "Login"}
          </button>
        </form>
        <p className="muted">
          Don't have an account? Register via Swagger / Postman (endpoint
          /api/auth/register) for dev.
        </p>
      </div>
    </div>
  );
}
