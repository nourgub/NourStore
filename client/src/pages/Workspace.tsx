import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Workspace() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const destination =
      user.role === "admin"
        ? "/admin"
        : user.role === "teacher"
          ? "/teacher"
          : user.role === "institution"
            ? "/institution"
            : user.role === "parent"
              ? "/parent"
              : "/dashboard";
    window.location.href = destination;
  }, [loading, user]);
  return (
    <div className="nourix-app auth-page">
      <main className="auth-main">
        <section className="auth-card">
          <div className="auth-mark">N</div>
          <div className="section-kicker">NOURIX / WORKSPACE</div>
          <h1>جاري تجهيز مساحتك</h1>
          <p>سيتم توجيهك تلقائيًا إلى لوحة الحساب المناسبة لدورك.</p>
        </section>
      </main>
    </div>
  );
}
