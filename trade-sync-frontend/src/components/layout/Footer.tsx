export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <span className="font-bold text-slate-200">TradeSync Pro</span>
          <p className="text-sm mt-1">Advanced Copy Trading Infrastructure</p>
        </div>
        <div className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} TradeSync Pro.
        </div>
      </div>
    </footer>
  );
}
