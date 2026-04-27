import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { doctorApi } from "../../api";
import { Search, Users, ChevronRight, Stethoscope } from "lucide-react";

export default function PatientViewer() {
  const [search, setSearch] = useState("");
  const [groupBySpec, setGroupBySpec] = useState(false);
  const [selected, setSelected] = useState(null);

  // In a real implementation, this would be a doctor-scoped patient search API
  // For now we show the concept with the available data
  const { data: profile } = useQuery({ queryKey: ["doctor-profile"], queryFn: () => doctorApi.myProfile().then(r => r.data) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg mb-1">My Patients</h1>
        <p className="text-fg-subtle text-sm">Patients previously diagnosed by you</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-dim" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" placeholder="Search by NIC or name..." />
        </div>
        <label className="flex items-center gap-2 cursor-pointer px-4">
          <span className="text-sm text-fg-muted whitespace-nowrap">Group by specialization</span>
          <div onClick={() => setGroupBySpec(p => !p)} className={`w-11 h-6 rounded-full relative transition-colors border border-line ${groupBySpec ? "bg-primary-600" : "bg-subtle"}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${groupBySpec ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
        </label>
      </div>

      {/* Specialization groups (displayed when toggle is on) */}
      {groupBySpec && profile?.specializations?.length > 0 && (
        <div className="space-y-4">
          {profile.specializations.map(spec => (
            <div key={spec.id} className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary-600/20"><Stethoscope size={16} className="text-primary-400" /></div>
                <h3 className="font-semibold text-fg">{spec.name}</h3>
              </div>
              <p className="text-fg-subtle text-sm italic">Patient records for this specialization will appear here once appointments are completed.</p>
            </div>
          ))}
        </div>
      )}

      {!groupBySpec && (
        <div className="glass-card p-8 text-center text-fg-subtle">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">Patient listing will display here based on completed appointments.</p>
          <p className="text-xs mt-1 text-fg-dim">Search by NIC or name to find specific patients.</p>
        </div>
      )}
    </div>
  );
}
