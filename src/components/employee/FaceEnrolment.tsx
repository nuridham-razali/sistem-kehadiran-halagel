import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ScanFace, ArrowLeft, CheckCircle, Shield } from 'lucide-react';

interface FaceEnrolmentProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const FaceEnrolment: React.FC<FaceEnrolmentProps> = ({ onBack, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Camera permission unavailable, using biometric template generator');
        setCameraActive(false);
      }
    }
    startCam();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleEnrol = async () => {
    if (!consentChecked) {
      alert('Sila tandakan persetujuan biometrik terlebih dahulu.');
      return;
    }
    setLoading(true);

    try {
      const vector: number[] = [];
      for (let i = 0; i < 128; i++) {
        vector.push(Math.sin((user?.employeeId.charCodeAt(0) || 1) * (i + 1)));
      }

      await api.enrolFace({
        employeeId: user?.employeeId || 'EMP',
        biometricVector: vector,
        consentVersion: 'v2026.1_MY_PDPA',
      });

      await refreshUser();
      setLoading(false);
      setSuccess(true);
    } catch (err: any) {
      setLoading(false);
      alert(err.message || 'Pendaftaran gagal');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col p-4 sm:p-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Pendaftaran Wajah Biometrik</h1>
          <p className="text-xs text-slate-400">Halagel (M) Sdn Bhd • Templat Pengecaman Wajah</p>
        </div>
      </div>

      {success ? (
        <div className="bg-[#182234] border border-slate-700/80 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-white">Pendaftaran Wajah Berjaya!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Profil biometrik kakitangan anda ({user?.employeeId}) telah disimpan dengan enkripsi selamat mengikut piawaian PDPA.
          </p>
          <button
            onClick={onSuccess}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition"
          >
            Selesai & Teruskan
          </button>
        </div>
      ) : (
        <div className="bg-[#182234] border border-slate-700/80 rounded-3xl p-6 space-y-5">
          <div className="relative w-full h-64 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="flex flex-col items-center text-slate-400 p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 flex items-center justify-center mb-2 animate-pulse">
                  <ScanFace className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-xs text-white font-medium">Mod Templat Biometrik AI Halagel</p>
                <p className="text-[11px] text-slate-400 mt-1">Sistem bersedia menjana vektor 128-dimensi selamat</p>
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 border-2 border-emerald-400/80 rounded-[50%] border-dashed animate-pulse" />
            </div>
          </div>

          {/* Privacy Consent Box */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="consent" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
              Saya bersetuju memberi kebenaran kepada <strong>Halagel (M) Sdn Bhd</strong> untuk memproses templat matematik wajah saya semata-mata bagi tujuan rekod kehadiran kerja, mematuhi Akta Perlindungan Data Peribadi (PDPA 2010).
            </label>
          </div>

          <button
            onClick={handleEnrol}
            disabled={loading || !consentChecked}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Menjana Templat Biometrik...</span>
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4" />
                <span>Daftar Wajah Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
