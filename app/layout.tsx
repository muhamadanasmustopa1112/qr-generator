import './globals.css';


export const metadata = {
title: 'QR Generator',
description: 'Simple QR generator without logo',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="id">
      <body className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100">
        <div className="mx-auto max-w-6xl p-4 md:p-8">
          <header className="mb-6 md:mb-10">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">QR Web Generator</h1>
            <p className="text-slate-400 mt-1">Elegan, cepat, dan sepenuhnya berjalan di browser. Tanpa logo.</p>
          </header>
          {children}
          <footer className="mt-10 text-xs text-slate-500/80">© {new Date().getFullYear()} — QR Generator • Next.js App Router</footer>
        </div>
      </body>
    </html>
  );
}
