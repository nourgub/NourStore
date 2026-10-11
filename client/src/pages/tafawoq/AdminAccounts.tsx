// Admin — accounts (role, password reset, status) and the logs (admin audit
// log, error log). Every call is an adminProcedure in server/routers/admin.ts:
// the server refuses it for any other role, whatever this page shows.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLang } from "./i18n";
import { bacError, useB } from "./bacI18n";

const ROLES = ["learner", "parent", "teacher", "admin"] as const;
type Role = (typeof ROLES)[number];
const STATUSES = ["active", "pending", "suspended"] as const;

function dateTime(value: Date | string | null | undefined, lang: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-DZ" : "en-GB");
}

function useOptions() {
  const b = useB();
  const utils = trpc.useUtils();
  return {
    onSuccess: async () => {
      toast.success(b.successToast);
      await utils.admin.invalidate();
    },
    onError: (error: { message: string }) => toast.error(bacError(b, error) === b.errors.generic ? error.message : bacError(b, error)),
  };
}

export function AdminAccounts() {
  const b = useB();
  const a = b.accounts;
  const lang = useLang();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [resetting, setResetting] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const list = trpc.admin.users.useQuery();
  const options = useOptions();
  const setUserRole = trpc.admin.updateUserRole.useMutation(options);
  const setStatus = trpc.admin.activateUser.useMutation(options);
  const reset = trpc.admin.resetPassword.useMutation({
    ...options,
    onSuccess: async () => {
      await options.onSuccess();
      setResetting(null);
      setPassword("");
    },
  });
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (list.data ?? []).filter(
      user => (!role || user.role === role) && (!needle || `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(needle))
    );
  }, [list.data, search, role]);

  return (
    <>
      <p className="tfq-muted">{a.intro}</p>
      <div className="tfq-card tfq-filters">
        <label className="tfq-field">
          {b.search}
          <input className="tfq-input" dir="auto" value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <label className="tfq-field">
          {a.role}
          <select className="tfq-select" value={role} onChange={event => setRole(event.target.value as Role | "")}>
            <option value="">{a.allRoles}</option>
            {ROLES.map(entry => (
              <option key={entry} value={entry}>
                {a.roles[entry]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {list.isLoading ? (
        <p className="tfq-muted" aria-busy="true">
          …
        </p>
      ) : list.error ? (
        <div className="tfq-card">{bacError(b, list.error)}</div>
      ) : (
        <div className="tfq-table-wrap">
          <table className="tfq-table">
            <thead>
              <tr>
                <th>{a.account}</th>
                <th>{a.role}</th>
                <th>{a.status}</th>
                <th>{a.lastSignIn}</th>
                <th>{a.password}</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map(user => (
                <tr key={user.id}>
                  <td>
                    <strong dir="auto">{user.name || "—"}</strong>
                    <br />
                    <small className="tfq-muted" dir="ltr">
                      {user.email}
                    </small>
                  </td>
                  <td>
                    <select
                      className="tfq-select"
                      aria-label={a.role}
                      value={user.role}
                      disabled={setUserRole.isPending}
                      onChange={event => {
                        const next = event.target.value as Role;
                        if (window.confirm(a.confirmRole(user.name || user.email || "", a.roles[next]))) setUserRole.mutate({ userId: user.id, role: next });
                      }}
                    >
                      {!ROLES.includes(user.role as Role) && <option value={user.role}>{user.role}</option>}
                      {ROLES.map(entry => (
                        <option key={entry} value={entry}>
                          {a.roles[entry]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="tfq-select"
                      aria-label={a.status}
                      value={user.accountStatus}
                      disabled={setStatus.isPending}
                      onChange={event => setStatus.mutate({ userId: user.id, status: event.target.value as (typeof STATUSES)[number] })}
                    >
                      {STATUSES.map(entry => (
                        <option key={entry} value={entry}>
                          {a.statuses[entry]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <small>{dateTime(user.lastSignedIn, lang)}</small>
                  </td>
                  <td>
                    {user.loginMethod !== "email" ? (
                      <small className="tfq-muted">{a.notPassword}</small>
                    ) : resetting === user.id ? (
                      <form
                        className="tfq-row"
                        style={{ gap: 6, flexWrap: "wrap" }}
                        onSubmit={event => {
                          event.preventDefault();
                          reset.mutate({ userId: user.id, newPassword: password });
                        }}
                      >
                        <input
                          className="tfq-input"
                          type="text"
                          dir="ltr"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={200}
                          required
                          placeholder={a.newPassword}
                          value={password}
                          onChange={event => setPassword(event.target.value)}
                        />
                        <button type="submit" className="tfq-btn small" disabled={reset.isPending}>
                          {a.save}
                        </button>
                        <button type="button" className="tfq-btn ghost small" onClick={() => setResetting(null)}>
                          {a.cancel}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="tfq-btn ghost small"
                        onClick={() => {
                          setResetting(user.id);
                          setPassword("");
                        }}
                      >
                        {a.resetPassword}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 200 && <p className="tfq-muted">{a.narrow}</p>}
        </div>
      )}
    </>
  );
}

export function AdminLogs() {
  const b = useB();
  const a = b.accounts;
  const lang = useLang();
  const [showResolved, setShowResolved] = useState(false);
  const audit = trpc.admin.auditLog.useQuery({ limit: 100 });
  const summary = trpc.admin.errorLogSummary.useQuery();
  const errors = trpc.admin.errorLog.useQuery({ limit: 100, resolved: showResolved ? undefined : false });
  const resolve = trpc.admin.markErrorResolved.useMutation(useOptions());

  return (
    <>
      <section className="tfq-card">
        <h3>{a.errorLog}</h3>
        {summary.data && <p className="tfq-muted">{a.errorSummary(summary.data.totalUnresolved, summary.data.last24hCount)}</p>}
        <label className="tfq-row" style={{ gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={showResolved} onChange={event => setShowResolved(event.target.checked)} /> {a.showResolved}
        </label>
        {errors.error ? (
          <p>{bacError(b, errors.error)}</p>
        ) : !errors.data?.length ? (
          <p className="tfq-muted">{errors.isLoading ? "…" : a.noErrors}</p>
        ) : (
          <ul className="tfq-notifs">
            {errors.data.map(entry => (
              <li key={entry.id}>
                <strong dir="ltr" style={{ overflowWrap: "anywhere" }}>
                  {entry.message}
                </strong>
                <small className="tfq-muted" dir="ltr" style={{ overflowWrap: "anywhere" }}>
                  {entry.source} · {entry.context ?? "—"} · {dateTime(entry.createdAt, lang)}
                  {entry.userName ? ` · ${entry.userName}` : ""}
                </small>
                <button
                  type="button"
                  className="tfq-btn ghost small"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: entry.id, resolved: !entry.resolved })}
                >
                  {entry.resolved ? a.reopen : a.markResolved}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="tfq-card">
        <h3>{a.auditLog}</h3>
        <p className="tfq-muted">{a.auditIntro}</p>
        {audit.error ? (
          <p>{bacError(b, audit.error)}</p>
        ) : !audit.data?.length ? (
          <p className="tfq-muted">{audit.isLoading ? "…" : a.noAudit}</p>
        ) : (
          <ul className="tfq-notifs">
            {audit.data.map(entry => (
              <li key={entry.id}>
                <strong dir="auto">
                  {entry.actorName ?? `#${entry.actorId}`} · <span dir="ltr">{entry.action}</span>
                </strong>
                <small className="tfq-muted" dir="ltr" style={{ overflowWrap: "anywhere" }}>
                  {entry.targetType}
                  {entry.targetId ? ` #${entry.targetId}` : ""} · {dateTime(entry.createdAt, lang)}
                  {entry.detailsJson ? ` · ${entry.detailsJson}` : ""}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
