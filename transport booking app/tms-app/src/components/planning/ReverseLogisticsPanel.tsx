

import { MapPin, Package, Clock, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useEmptyAssets } from '@/hooks/usePlanning';
import { formatDate } from '@/lib/utils';

export function ReverseLogisticsPanel() {
  const { data: emptyAssets = [], isLoading, refetch } = useEmptyAssets();

  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="font-semibold text-gray-900">Reverse Logistics</h3>
          <p className="text-xs text-gray-500 mt-0.5">Empty assets available for backhaul</p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading && (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
            Loading asset locations…
          </div>
        )}
        {!isLoading && emptyAssets.length === 0 && (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
            No empty assets found at customer sites
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {emptyAssets.map((asset) => (
            <div key={asset.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{asset.asset_id}</p>
                  <Badge variant="warning">Empty</Badge>
                  {(asset as any).is_bpa_site && <Badge variant="danger">BPA Site</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{asset.asset_type}</p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {(asset as any).site_name ?? asset.last_known_location ?? 'Unknown location'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatDate(asset.last_updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
