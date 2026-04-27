import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorApi, appointmentApi, paymentApi } from "../../api";
import { Calendar, ArrowLeft, Clock, AlertTriangle, CheckCircle, Upload, X, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";

const TERMS = `APPOINTMENT TERMS & CONDITIONS

1. CANCELLATION POLICY
   • Full refund: Cancel 24+ hours before appointment
   • 50% refund: Cancel within 24 hours of appointment
   • No refund: No-shows or same-day cancellations

2. RESCHEDULING
   Rescheduling is permitted up to 12 hours before the appointment, subject to availability.

3. PATIENT RESPONSIBILITIES
   • Arrive 10 minutes before scheduled time
   • Bring relevant medical documents
   • Contact us if you need to cancel

4. DATA USAGE
   Your medical information is stored securely and used only for your care. It is never shared without consent.

5. NO-SHOW POLICY
   Repeated no-shows may result in suspension from the booking system.

By checking the box below, you confirm you have read and agree to these terms.`;

export default function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedSession, setSelectedSession] = useState(null);
  const [step, setStep] = useState("calendar"); // calendar | booking | confirmation
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [bookedAppt, setBookedAppt] = useState(null);

  const { data: doctor, isLoading } = useQuery({ queryKey: ["doctor", id], queryFn: () => doctorApi.get(id).then(r => r.data) });
  const { data: availability = [] } = useQuery({ queryKey: ["availability", id], queryFn: () => doctorApi.availability(id).then(r => r.data) });
  const { data: slots = [] } = useQuery({
    queryKey: ["slots", selectedSession?.session_id],
    queryFn: () => appointmentApi.slots(selectedSession.session_id).then(r => r.data),
    enabled: !!selectedSession,
  });

  const { mutate: book, isPending: booking } = useMutation({
    mutationFn: (data) => appointmentApi.book(data),
    onSuccess: async (res) => {
      const appt = res.data;
      setBookedAppt(appt);
      // Mock payment
      try {
        await paymentApi.create({ appointment_id: appt.id, amount: doctor?.consultation_fee || 0, method: "mock" });
      } catch {}
      setStep("confirmation");
      qc.invalidateQueries(["upcoming-appts"]);
      toast.success("Appointment booked!");
    },
    onError: (err) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  const handleBook = () => {
    if (!termsAccepted) { toast.error("Please accept the terms and conditions"); return; }
    book({ session_id: selectedSession.session_id, symptoms_text: symptoms, terms_accepted: true });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !bookedAppt) return;
    setUploadedFile(file);
    try {
      await appointmentApi.uploadAttachment(bookedAppt.id, file);
      toast.success("Report uploaded!");
    } catch { toast.error("Upload failed"); }
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="glass-card h-48" /><div className="glass-card h-64" /></div>;
  if (!doctor) return <div className="text-fg-subtle text-center py-16">Doctor not found</div>;

  if (step === "confirmation") return (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <div className="glass-card p-10">
        <div className="w-16 h-16 rounded-full bg-accent-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-accent-400" />
        </div>
        <h2 className="text-2xl font-bold text-fg mb-2">Booking Confirmed!</h2>
        <p className="text-fg-subtle mb-6">Your appointment has been booked. Slot #{bookedAppt?.slot_number}</p>

        {/* Optional: symptoms + report */}
        <div className="text-left space-y-4 border-t border-line pt-6">
          <p className="text-sm font-medium text-fg-muted">Optional: Add more details</p>
          <div>
            <label className="input-label">Describe your symptoms</label>
            <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)}
              className="input-field" rows={3} placeholder="Describe current symptoms..." />
          </div>
          <div>
            <label className="input-label">Upload Medical Reports (optional)</label>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-line hover:border-primary-500/50 cursor-pointer transition-colors bg-subtle">
              <Upload size={18} className="text-fg-dim" />
              <span className="text-fg-subtle text-sm">{uploadedFile ? uploadedFile.name : "Click to upload PDF or image"}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => toast("Email notification will be sent soon!", { icon: "📧" })} className="btn-secondary flex-1 justify-center">
              Send Email Notification
            </button>
          </div>
        </div>

        <button onClick={() => navigate("/patient/appointments")} className="btn-primary w-full justify-center mt-6">
          Back to Appointments
        </button>
      </div>
    </div>
  );

  if (step === "booking") return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => setStep("calendar")} className="flex items-center gap-2 text-fg-muted hover:text-fg text-sm">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-xl font-bold text-fg">Confirm Booking</h2>
        <div className="p-4 rounded-xl bg-primary-600/10 border border-primary-500/20 text-sm space-y-1">
          <p className="text-fg-muted">Session: <span className="text-fg font-medium">{selectedSession?.date}</span></p>
          <p className="text-fg-muted">Time: <span className="text-fg font-medium">{selectedSession?.start_time}</span></p>
          <p className="text-fg-muted">Fee: <span className="text-accent-400 font-semibold">LKR {Number(doctor.consultation_fee || 0).toFixed(2)}</span></p>
        </div>

        {/* T&C */}
        <div>
          <p className="input-label mb-2">Terms & Conditions <span className="text-red-400">*</span></p>
          <pre className="text-xs text-fg-muted bg-subtle rounded-xl p-4 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed border border-line">{TERMS}</pre>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="w-4 h-4 accent-primary-500" />
          <span className="text-sm text-fg-muted">I have read and agree to the Terms & Conditions</span>
        </label>

        {!termsAccepted && <div className="flex items-center gap-2 text-amber-400 text-xs"><AlertTriangle size={14} />You must accept the terms to proceed</div>}

        <div className="flex gap-3">
          <button onClick={handleBook} disabled={!termsAccepted || booking} className="btn-primary flex-1 justify-center py-3">
            {booking ? "Booking..." : "Confirm & Pay"}
          </button>
          <button onClick={() => setStep("calendar")} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );

  // Calendar view
  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-fg-muted hover:text-fg text-sm">
        <ArrowLeft size={16} /> Back to Doctors
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-3xl font-bold text-white mb-4">
              {(doctor.email || "D")[0].toUpperCase()}
            </div>
            <h1 className="text-xl font-bold text-fg mb-1">{doctor.email?.split("@")[0].replace(/\./g, " ")}</h1>
            <p className="text-primary-600 dark:text-primary-400 text-sm mb-3">{doctor.reg_number}</p>
            {doctor.is_verified && <span className="badge badge-success mb-3">✓ Verified</span>}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {doctor.specializations?.map(s => <span key={s.id} className="badge badge-info">{s.name}</span>)}
            </div>
            <div className="space-y-2 text-sm text-fg-muted">
              {doctor.years_experience && <p>🏥 {doctor.years_experience} years experience</p>}
              {doctor.affiliation && <p>📍 {doctor.affiliation}</p>}
              {doctor.qualifications && <p>🎓 {doctor.qualifications}</p>}
              {doctor.consultation_fee && <p className="text-accent-400 font-semibold">💰 LKR {Number(doctor.consultation_fee).toFixed(2)}</p>}
            </div>
            {doctor.bio && <p className="text-fg-subtle text-sm mt-3 leading-relaxed border-t border-line pt-3">{doctor.bio}</p>}
          </div>
        </div>

        {/* Availability */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-fg mb-4 flex items-center gap-2"><Calendar size={18} className="text-primary-600 dark:text-primary-400" />Available Dates</h2>
            {availability.length === 0 ? (
              <p className="text-fg-subtle text-sm">No available sessions scheduled</p>
            ) : (
              <div className="space-y-3">
                {availability.map(s => (
                  <button key={s.session_id} onClick={() => setSelectedSession(selectedSession?.session_id === s.session_id ? null : s)}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 ${selectedSession?.session_id === s.session_id ? "border-primary-500 bg-primary-600/10" : "border-line bg-subtle hover:border-primary-500/40"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-fg">{format(parseISO(s.date), "EEEE, MMMM d, yyyy")}</p>
                        <p className="text-fg-subtle text-sm mt-0.5">
                          <Clock size={12} className="inline mr-1" />{s.start_time} — {s.end_time}
                        </p>
                      </div>
                      <span className="badge badge-success">Available</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Slots */}
          {selectedSession && (
            <div className="glass-card p-6">
              <h3 className="text-base font-bold text-fg mb-4">Available Slots — {selectedSession.date}</h3>
              {slots.length === 0 ? (
                <p className="text-fg-subtle text-sm">Loading slots...</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {slots.map(slot => (
                    <div key={slot.slot_number} className={`p-2.5 rounded-xl text-center text-sm border ${slot.is_available ? "border-accent-500/30 bg-accent-500/10 text-accent-400" : "border-line bg-subtle text-fg-dim cursor-not-allowed"}`}>
                      <p className="font-medium">{slot.start_time}</p>
                      <p className="text-xs">{slot.is_available ? "Available" : "Booked"}</p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setStep("booking")} className="btn-primary w-full justify-center">
                Book Next Available Slot →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
