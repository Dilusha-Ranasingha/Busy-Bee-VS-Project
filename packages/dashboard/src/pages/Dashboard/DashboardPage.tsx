import { useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';
import { KpiCard, ChartCard, EmptyState, ChartSkeleton } from '../../components/charts/ChartComponents';
// Gamaya
import ForecastWidget from '../../features/forecasting/ForecastWidget';

// Register chart.js components once
ChartJS.register(ArcElement, Tooltip, Legend, Title);

export default function DashboardPage() {
  const { items, loading } = useProducts();

  const { quantityPie, soldVsStockDoughnut, totals } = useMemo(() => {
    const labels = items.map((p) => p.name);
    const qtyData = items.map((p) => Number(p.quantity || 0));

    const totalSold = items.reduce((sum, p) => sum + Number(p.soldCount || 0), 0);
    const totalQty = items.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    const totalStockLeft = Math.max(totalQty - totalSold, 0);

    const palette = [
      '#6366F1',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#3B82F6',
      '#8B5CF6',
      '#14B8A6',
      '#F43F5E',
      '#84CC16',
      '#06B6D4',
    ];

    const quantityPie = {
      labels,
      datasets: [
        {
          label: 'Quantity share',
          data: qtyData,
          backgroundColor: labels.map((_, i) => palette[i % palette.length]),
          borderWidth: 1,
        },
      ],
    };

    const soldVsStockDoughnut = {
      labels: ['Sold', 'In stock'],
      datasets: [
        {
          label: 'Units',
          data: [totalSold, totalStockLeft],
          backgroundColor: ['#F97316', '#22C55E'],
          borderWidth: 1,
        },
      ],
    };

    return {
      quantityPie,
      soldVsStockDoughnut,
      totals: { totalQty, totalSold, totalStockLeft },
    };
  }, [items]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* KPIs */}
      <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Total Quantity" value={totals.totalQty} />
        <KpiCard title="Total Sold" value={totals.totalSold} />
        <KpiCard title="In Stock" value={totals.totalStockLeft} />
      </div>

      {/* Gamaya sample */}
    <div className="lg:col-span-3">
      <ForecastWidget />
    </div>


      {/* Charts */}
      <ChartCard
        title="Quantity by Product"
        description="Share of total inventory by product"
        className="lg:col-span-2"
      >
        {loading ? (
          <ChartSkeleton />
        ) : items.length ? (
          <div className="w-56 h-56 mx-auto">
            <Pie
              data={quantityPie}
              options={{
                plugins: { legend: { position: 'bottom' } },
                maintainAspectRatio: false,
              }}
            />
          </div>
        ) : (
          <EmptyState />
        )}
      </ChartCard>

      <ChartCard
        title="Sold vs In Stock"
        description="Overall units sold vs current stock"
        className="lg:col-span-1"
      >
        {loading ? (
          <ChartSkeleton />
        ) : totals.totalQty + totals.totalSold ? (
          <div className="w-48 h-48 mx-auto">
            <Doughnut
              data={soldVsStockDoughnut}
              options={{
                plugins: { legend: { position: 'bottom' } },
                maintainAspectRatio: false,
              }}
            />
          </div>
        ) : (
          <EmptyState />
        )}
      </ChartCard>
    </div>
  );
}
