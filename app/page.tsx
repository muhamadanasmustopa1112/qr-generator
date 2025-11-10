'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

type ECC = 'L' | 'M' | 'Q' | 'H';

function hexToRgb(hex: string) {
  const m = hex.replace('#','');
  const bigint = parseInt(m.length === 3 ? m.split('').map(c=>c+c).join('') : m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const a = [r, g, b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(fgHex: string, bgHex: string) {
  const L1 = luminance(hexToRgb(fgHex));
  const L2 = luminance(hexToRgb(bgHex));
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export default function Page() {
  const [text, setText] = useState<string>('https://telkomaterial.co.id');
  const [size, setSize] = useState<number>(384);
  const [margin, setMargin] = useState<number>(16);
  const [ecc, setEcc] = useState<ECC>('M');
  const [fg, setFg] = useState<string>('#0f172a'); // warna depan
  const [bg, setBg] = useState<string>('#ffffff'); // warna latar
  const [auto, setAuto] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg]);
  const lowContrast = ratio < 4.5; // ambang WCAG teks normal—pakai sebagai indikator aman discan

  const opts = useMemo(
    () => ({
      errorCorrectionLevel: ecc,
      color: { dark: fg, light: bg },
      margin: 0, // margin manual biar quiet zone rapi
      width: size,
      scale: 1,
    }),
    [ecc, fg, bg, size]
  );

  async function render() {
    const base = document.createElement('canvas');
    await QRCode.toCanvas(base, text || ' ', opts);

    const out = canvasRef.current;
    if (!out) return;
    const m = Math.max(0, margin);
    out.width = (base.width || size) + m * 2;
    out.height = (base.height || size) + m * 2;

    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // latar luar
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, out.width, out.height);

    // gambar QR
    ctx.drawImage(base, m, m);

    // garis pinggir tipis untuk bantu visibilitas di latar apa pun
    ctx.strokeStyle = (luminance(hexToRgb(bg)) > 0.5) ? '#0f172a' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, out.width - 1, out.height - 1);
  }

  // Auto-generate dengan debounce
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(render, 180);
    return () => clearTimeout(t);
  }, [text, size, margin, ecc, fg, bg, auto]);

  // Render pertama
  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadPNG() {
    const c = canvasRef.current; if (!c) return;
    const a = document.createElement('a');
    a.download = `qr-${Date.now()}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  }

  function downloadPDF() {
    const c = canvasRef.current; if (!c) return;
    const dataURL = c.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const x = 24, y = 28, w = 58, h = 58; // 58mm square
    pdf.addImage(dataURL, 'PNG', x, y, w, h, undefined, 'FAST');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(text, 120);
    pdf.text(lines, x, y + h + 6);
    pdf.save(`qr-${Date.now()}.pdf`);
  }

  function copyText() {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function fixContrast() {
    // Ganti warna depan jadi putih jika latar gelap, atau hitam jika latar terang
    const bgLum = luminance(hexToRgb(bg));
    setFg(bgLum > 0.5 ? '#000000' : '#ffffff');
  }

  const presetSizes = [256, 320, 384, 448, 512];
  const eccLevels: ECC[] = ['L', 'M', 'Q', 'H'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Controls */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="space-y-4 relative">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Isi QR (teks / URL)</label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="https://contoh.com / SKU123 / teks bebas"
              />
              <button
                onClick={copyText}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2
                          bg-emerald-500 text-black font-semibold
                          shadow-sm hover:bg-emerald-400 active:bg-emerald-500
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300
                          border border-emerald-400/60"
                title="Salin ke clipboard"
                aria-label="Salin ke clipboard"
              >
                {/* ikon clipboard */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    className="w-4 h-4" fill="currentColor" aria-hidden="true">
                  <path d="M9 2a2 2 0 0 0-2 2H5.5A1.5 1.5 0 0 0 4 5.5v14A1.5 1.5 0 0 0 5.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8h-3a2 2 0 0 1-2-2V3H9zm4 1.414L17.586 8H15a1 1 0 0 1-1-1V3.414zM8 11h8v2H8v-2zm0 4h8v2H8v-2z"/>
                </svg>
                Salin
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Ukuran (px)</label>
              <input
                type="number"
                min={128}
                step={32}
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value || '384', 10))}
                className="w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-slate-100"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {presetSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs border ${
                      size === s
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-slate-900/60 text-slate-200 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Margin (px)</label>
              <input
                type="number"
                min={0}
                step={2}
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value || '16', 10))}
                className="w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Error Correction</label>
              <div className="flex flex-wrap gap-2">
                {eccLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setEcc(level)}
                    className={`px-3 py-2 rounded-lg text-xs border ${
                      ecc === level
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-slate-900/60 text-slate-200 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Warna depan</label>
              <input
                type="color"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                className="w-full h-10 rounded-lg bg-slate-950/70 border border-white/10"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Warna latar</label>
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="w-full h-10 rounded-lg bg-slate-950/70 border border-white/10"
              />
            </div>

            <div className="col-span-2 md:col-span-3 flex flex-col gap-2">
              {/* Indikator kontras */}
              <div className={`rounded-xl border px-3 py-2 text-xs flex items-center justify-between ${
                lowContrast ? 'bg-amber-500/10 border-amber-400/30 text-amber-200' : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
              }`}>
                <span>
                  Kontras: {ratio.toFixed(2)} {lowContrast ? '• Rendah (risiko sulit discan)' : '• Baik'}
                </span>
                {lowContrast && (
                  <button onClick={fixContrast} className="ml-3 rounded-lg px-2 py-1 bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30">
                    Perbaiki otomatis
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={auto}
                    onChange={(e) => setAuto(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  Auto-generate saat mengetik
                </label>
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={render}
                    className="rounded-xl bg-emerald-500 text-black font-semibold px-4 py-2"
                  >
                    Generate
                  </button>
                  <button
                    onClick={downloadPNG}
                    className="rounded-xl bg-slate-800 text-slate-100 border border-white/10 px-4 py-2 hover:bg-slate-700"
                  >
                    Unduh PNG
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="rounded-xl bg-slate-800 text-slate-100 border border-white/10 px-4 py-2 hover:bg-slate-700"
                  >
                    Unduh PDF
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 grid place-items-center min-h-[420px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="relative">
          <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 blur-xl" />
          <div className="relative p-4 rounded-2xl bg-[conic-gradient(at_50%_50%,#f8fafc_0_25%,#e2e8f0_0_50%,#f8fafc_0_75%,#e2e8f0_0)] [background-size:12px_12px]">
            <canvas ref={canvasRef} className="bg-white rounded-xl shadow-2xl" />
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-300">
          Preview interaktif • Pastikan kontras memadai agar mudah dipindai.
        </p>
      </section>
    </div>
  );
}
