"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.assign("/admin");
        return;
      }
      setError(data.error || "Wrong passcode.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page admin-login">
      <h1>HAC Admin</h1>
      <p className="muted">Hostel Calendar administration</p>
      <form onSubmit={submit}>
        <input type="password" placeholder="Passcode" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        <button type="submit" disabled={loading || !password}>{loading ? "Checking…" : "Sign in"}</button>
      </form>
      {error && <p className="status status-error">{error}</p>}
    </main>
  );
}
