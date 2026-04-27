import { useEffect, useMemo, useState } from "react";
import { useNavigate, createSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { doctorApi, specializationApi } from "../../api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import Avatar from "../../components/Avatar";
import Ico from "../../components/Ico";

function formatCurrencyLKR(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default function FindDoctors() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [specId, setSpecId] = useState("");

  const { data: specs = [] } = useQuery({
    queryKey: ["specializations"],
    queryFn: () => specializationApi.list().then((r) => r.data),
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = useMemo(() => {
    const params = {};
    if (debouncedSearch.trim()) params.name = debouncedSearch.trim();
    if (specId) params.specialization_id = Number(specId);
    params.page = 1;
    params.size = 24;
    return params;
  }, [debouncedSearch, specId]);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors", queryParams],
    queryFn: () => doctorApi.list(queryParams).then((r) => r.data),
  });

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <PageHeader title="Find Doctors" subtitle="Browse verified specialists and book a consultation" />

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240, maxWidth: 380 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <Ico n="search" size={15} color="var(--ink-mute)" />
          </div>
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search by doctor email or bio…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div style={{ minWidth: 220 }}>
          <select className="input" value={specId} onChange={(e) => setSpecId(e.target.value)}>
            <option value="">All specializations</option>
            {specs.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "var(--ink-mute)" }}>
        {isLoading ? "Loading doctors…" : (
          <>
            Showing <strong style={{ color: "var(--ink)" }}>{doctors.length}</strong> verified specialists
          </>
        )}
      </div>

      {doctors.length === 0 && !isLoading ? (
        <div className="card">
          <EmptyState icon="search" title="No doctors found" desc="Try a different name or specialization." />
        </div>
      ) : (
        <div className="grid-auto">
          {doctors.map((d) => (
            <div
              key={d.id}
              className="doctor-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate({ pathname: `/patient/doctors/${d.id}` })}
              onKeyDown={(e) => e.key === "Enter" && navigate({ pathname: `/patient/doctors/${d.id}` })}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
                <Avatar name={d.email?.split("@")[0]} email={d.email} size={52} radius={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 750, fontSize: 15, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.email ? d.email.split("@")[0].replace(/\./g, " ") : "Doctor"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(d.specializations || []).slice(0, 3).map((s) => (
                      <span key={s.id} className="badge badge-blue" style={{ fontSize: 11 }}>
                        {s.name}
                      </span>
                    ))}
                    {(d.specializations || []).length > 3 ? <span className="badge badge-neutral" style={{ fontSize: 11 }}>+{(d.specializations || []).length - 3}</span> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--ink-mute)", marginBottom: 14 }}>
                <span>
                  <strong style={{ color: "var(--ink)", fontWeight: 650 }}>{d.years_experience ?? "—"}</strong> yrs exp
                </span>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span>
                  <strong style={{ color: "var(--ink)", fontWeight: 650 }}>{formatCurrencyLKR(d.consultation_fee)}</strong>
                </span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate({ pathname: `/patient/doctors/${d.id}`, search: createSearchParams({ book: "1" }).toString() });
                }}
              >
                <Ico n="calendar" size={13} /> Book Appointment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

