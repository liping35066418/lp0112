import { useToast } from '@/store/auth.js';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export function Toaster() {
  const items = useToast(s => s.items);
  const remove = useToast(s => s.remove);
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 w-[340px] pointer-events-none">
      {items.map(it => {
        const Icon = it.type === 'success' ? CheckCircle2 : it.type === 'error' ? XCircle : it.type === 'warning' ? AlertTriangle : Info;
        const color = it.type === 'success' ? 'text-emerald-400' : it.type === 'error' ? 'text-rose-400' : it.type === 'warning' ? 'text-amber-400' : 'text-brand-400';
        const border = it.type === 'success' ? 'border-emerald-500/30' : it.type === 'error' ? 'border-rose-500/30' : it.type === 'warning' ? 'border-amber-500/30' : 'border-brand-400/30';
        return (
          <div key={it.id} className={`glass-strong ${border} px-4 py-3 pointer-events-auto flex items-start gap-3 animate-slide-up shadow-2xl`}>
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
            <div className="flex-1 text-sm text-slate-200 leading-relaxed break-all">{it.message}</div>
            <button onClick={() => remove(it.id)} className="text-slate-500 hover:text-slate-300 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Toaster;
