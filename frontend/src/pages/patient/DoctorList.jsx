import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { doctorApi, specializationApi } from "../../api";
import { Search, Star, Clock, MapPin, ChevronRight } from "lucide-react";

export default function DoctorList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("");

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors", search, specFilter],
    queryFn: () => doctorApi.list({ name: search || undefined, specialization_id: specFilter || undefined }).then(r => r.data),
    debounce: 300,
  });

  const { data: specs = [] } = useQuery({
    queryKey: ["specializations"],
    queryFn: () => specializationApi.list().then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg mb-1">Find a Doctor</h1>
        <p className="text-fg-subtle text-sm">Browse our network of verified healthcare professionals</p>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-10" placeholder="Search by doctor name or keyword..." />
        </div>
        <select value={specFilter} onChange={e => setSpecFilter(e.target.value)} className="input-field sm:w-64">
          <option value="">All Specializations</option>
          {specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="glass-card p-16 text-center text-fg-subtle">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p>No doctors found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {doctors.map(d => (
            <button key={d.id} onClick={() => navigate(`/patient/appointments/doctor/${d.id}`)}
              className="glass-card p-5 text-left hover:border-primary-500/40 hover:shadow-glass transition-all duration-300 group">
              {/* Avatar */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
                  {(d.email || "D")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-fg truncate">{d.email?.split("@")[0].replace(/\./g, " ")}</p>
                  <p className="text-primary-600 dark:text-primary-400 text-xs">{d.reg_number}</p>
                  {d.is_verified && <span className="badge badge-success mt-1">✓ Verified</span>}
                </div>
                <ChevronRight size={16} className="text-fg-dim group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-shrink-0" />
              </div>

              {/* Specializations */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {d.specializations?.slice(0, 3).map(s => (
                  <span key={s.id} className="badge badge-info">{s.name}</span>
                ))}
                {d.specializations?.length > 3 && <span className="badge badge-neutral">+{d.specializations.length - 3}</span>}
              </div>

              {/* Meta */}
              <div className="space-y-1.5">
                {d.years_experience && (
                  <div className="flex items-center gap-1.5 text-fg-subtle text-xs">
                    <Star size={12} />{d.years_experience} years experience
                  </div>
                )}
                {d.affiliation && (
                  <div className="flex items-center gap-1.5 text-fg-subtle text-xs truncate">
                    <MapPin size={12} />{d.affiliation}
                  </div>
                )}
                {d.consultation_fee && (
                  <div className="flex items-center gap-1.5 text-accent-400 text-xs font-semibold">
                    <Clock size={12} />LKR {Number(d.consultation_fee).toFixed(2)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
