import { useState } from 'react';
import { Star, Lightbulb, ChevronDown, ChevronUp, Truck, ChevronRight } from 'lucide-react';
import { COMMON_ROUTES } from '@/lib/reference-data';
import { cn } from '@/lib/utils';

type Route = { loading: string; delivery: string; customer: string; truck_type: string };

export interface RouteSelection {
  customer: string;
  loading_place: string;
  delivery_place: string;
  truck_type: string;
}

const FAV_KEY = 'tms_fav_routes';

function routeKey(r: Route) {
  return `${r.loading}|${r.delivery}|${r.customer}`;
}

function loadFavs(): Set<string> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFavs(favs: Set<string>) {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
}

export function RouteSuggestPanel({ onSelect }: { onSelect: (r: RouteSelection) => void }) {
  const [favKeys, setFavKeys] = useState<Set<string>>(loadFavs);
  const [expanded, setExpanded] = useState(false);

  function toggleFav(r: Route, e: React.MouseEvent) {
    e.stopPropagation();
    setFavKeys(prev => {
      const next = new Set(prev);
      const k = routeKey(r);
      if (next.has(k)) next.delete(k); else next.add(k);
      saveFavs(next);
      return next;
    });
  }

  function select(r: Route) {
    onSelect({ customer: r.customer, loading_place: r.loading, delivery_place: r.delivery, truck_type: r.truck_type });
  }

  const favRoutes = COMMON_ROUTES.filter(r => favKeys.has(routeKey(r)));
  const otherRoutes = COMMON_ROUTES.filter(r => !favKeys.has(routeKey(r)));
  const visibleOthers = expanded ? otherRoutes : otherRoutes.slice(0, 3);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-xs font-bold text-gray-500">เส้นทางแนะนำ — กดเพื่อเติมข้อมูลอัตโนมัติ</span>
      </div>

      {favRoutes.length > 0 && (
        <>
          <p className="text-[10px] font-semibold text-amber-600 px-0.5">⭐ โปรด</p>
          {favRoutes.map(r => (
            <RouteRow key={routeKey(r)} r={r} isFav onSelect={select} onToggleFav={toggleFav} />
          ))}
        </>
      )}

      {favRoutes.length > 0 && otherRoutes.length > 0 && (
        <p className="text-[10px] font-semibold text-gray-400 px-0.5">ทั้งหมด</p>
      )}

      {visibleOthers.map(r => (
        <RouteRow key={routeKey(r)} r={r} isFav={false} onSelect={select} onToggleFav={toggleFav} />
      ))}

      {otherRoutes.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-2 text-xs font-semibold text-gray-400 hover:bg-gray-50 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="h-3.5 w-3.5" /> ย่อ</>
            : <><ChevronDown className="h-3.5 w-3.5" /> ดูเพิ่มเติม ({otherRoutes.length - 3})</>}
        </button>
      )}
    </div>
  );
}

function RouteRow({ r, isFav, onSelect, onToggleFav }: {
  r: Route;
  isFav: boolean;
  onSelect: (r: Route) => void;
  onToggleFav: (r: Route, e: React.MouseEvent) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(r)}
      onKeyDown={e => e.key === 'Enter' && onSelect(r)}
      className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-3 py-2.5 transition-all hover:border-amber-300 hover:bg-amber-50/40 cursor-pointer"
    >
      <Truck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      <span className="font-semibold text-gray-800 text-xs w-20 truncate shrink-0">{r.customer}</span>
      <span className="text-[11px] text-gray-500 shrink-0">{r.loading}</span>
      <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
      <span className="text-[11px] text-gray-500 shrink-0">{r.delivery}</span>
      <span className="ml-auto text-[10px] text-gray-400 shrink-0 max-w-[72px] text-right truncate leading-tight">
        {r.truck_type.split('(')[0].trim()}
      </span>
      <button
        type="button"
        onClick={e => onToggleFav(r, e)}
        className="shrink-0 rounded-lg p-1 hover:bg-amber-100 transition-colors"
        title={isFav ? 'ลบออกจากโปรด' : 'บันทึกเป็นโปรด'}
      >
        <Star className={cn('h-3.5 w-3.5', isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-300')} />
      </button>
    </div>
  );
}
