'use client';

import { useState, useEffect } from 'react';
import { evnApi, EvnMeterReadingRequest, DailyReading } from '@/lib/api/evn';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Key,
  EyeOff,
  Layers,
} from 'lucide-react';

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function formatDateShort(dateStr: string): string {
  const date = parseDate(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDayOfWeek(dateStr: string): string {
  const date = parseDate(dateStr);
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[date.getDay()];
}

function getLast7DaysDateRange(): { ngayDau: string; ngayCuoi: string } {
  const today = new Date();
  const hour = today.getHours();

  // Nếu đang trong khung 0h-12h sáng, lấy từ hôm trước nữa (8 ngày), còn không thì lấy 7 ngày
  const daysToSubtract = hour < 12 ? 8 : 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysToSubtract);

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  console.log('formatDate(today)', formatDate(today));

  return {
    ngayDau: formatDate(startDate),
    ngayCuoi: formatDate(today),
  };
}

function calculateDailyUsage(
  readings: DailyReading[],
): { date: string; usage: number }[] {
  const usage: { date: string; usage: number }[] = [];
  for (let i = 1; i < readings.length; i++) {
    // Điện tiêu thụ từ readings[i-1] đến readings[i] là của ngày readings[i-1]
    usage.push({
      date: readings[i - 1].date,
      usage: readings[i].value - readings[i - 1].value,
    });
  }
  return usage;
}

export default function MemberElectricityPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsage, setDailyUsage] = useState<
    { date: string; usage: number }[]
  >([]);
  const [latestIndex, setLatestIndex] = useState<number>(0);
  const [totalUsage, setTotalUsage] = useState<number>(0);
  const [credentialsChecked, setCredentialsChecked] = useState(false);
  const [hasEvnAccess, setHasEvnAccess] = useState(false);

  // Last 3 months total state
  const [last3MonthsTotal, setLast3MonthsTotal] = useState<{
    thang1: number;
    thang2: number;
    thang3: number;
    tongCong: number;
    thang1Label?: string;
    thang2Label?: string;
    thang3Label?: string;
  } | null>(null);

  // Default values for the logged-in member
  const [formData, setFormData] = useState<EvnMeterReadingRequest>(() => ({
    customerId: 'PD30000222084',
    maDiemDo: 'PD30000222084001',
    maDonVi: 'HN0100',
    ...getLast7DaysDateRange(),
  }));

  const handleFetchReadings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evnApi.getMeterReadings(formData);
      setLatestIndex(data.latestIndex || 0);
      setTotalUsage(data.usage || 0);
      if (data.readings) {
        setDailyUsage(calculateDailyUsage(data.readings));
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải chỉ số điện');
    } finally {
      setLoading(false);
    }
  };

  // Check EVN credentials access on mount
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const accessResult = await evnApi.checkAccess();
        setHasEvnAccess(accessResult.hasAccess);
        if (accessResult.hasAccess) {
          handleFetchReadings();

          // Fetch last 3 months total
          try {
            const totalData = await evnApi.getLast3MonthsTotal();
            setLast3MonthsTotal(totalData);
          } catch (err) {
            console.error('Failed to fetch last 3 months total:', err);
          }
        }
      } catch (err: any) {
        // If checkAccess fails, still try to fetch readings
        // The backend will use environment credentials as fallback
        handleFetchReadings();
      } finally {
        setCredentialsChecked(true);
      }
    };
    checkAccess();
  }, []);

  const yesterdayUsage =
    dailyUsage.length > 0 ? dailyUsage[dailyUsage.length - 1].usage : 0;
  const dayBeforeYesterdayUsage =
    dailyUsage.length > 1 ? dailyUsage[dailyUsage.length - 2].usage : 0;
  const usageChange = yesterdayUsage - dayBeforeYesterdayUsage;
  const usageChangePercent =
    dayBeforeYesterdayUsage > 0
      ? (usageChange / dayBeforeYesterdayUsage) * 100
      : 0;

  const chartMaxValue = Math.max(...dailyUsage.map((d) => d.usage), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Điện Năng Tiêu Thụ
          </h1>
          <p className="text-sm text-gray-500">
            Theo dõi chỉ số điện hàng ngày của bạn
          </p>
        </div>

        {/* No Access Message */}
        {!hasEvnAccess && credentialsChecked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-full flex-shrink-0">
                <EyeOff className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-yellow-800 font-semibold text-sm sm:text-base mb-1">
                  Chủ nhà chưa chia sẻ thông tin tiền điện
                </h3>
                <p className="text-yellow-600 text-xs sm:text-sm">
                  Để xem được chỉ số điện, chủ nhà cần cấp quyền truy cập cho
                  bạn trong phần quản lý tiền điện.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats - Only show when has access */}
        {hasEvnAccess && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-100 rounded-full">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    Hôm qua
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {yesterdayUsage.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">kWh</p>
              </div>

              <div
                className={`bg-gradient-to-br rounded-2xl shadow p-4 ${
                  usageChange >= 0
                    ? 'from-orange-50 to-red-50'
                    : 'from-green-50 to-emerald-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`p-1.5 rounded-full ${
                      usageChange >= 0 ? 'bg-orange-100' : 'bg-green-100'
                    }`}
                  >
                    {usageChange >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    So sánh
                  </span>
                </div>
                <p
                  className={`text-lg font-bold ${
                    usageChange >= 0 ? 'text-orange-600' : 'text-green-600'
                  }`}
                >
                  {usageChange >= 0 ? '+' : ''}
                  {usageChange.toFixed(1)}
                </p>
                <p
                  className={`text-xs ${
                    usageChange >= 0 ? 'text-orange-500' : 'text-green-500'
                  }`}
                >
                  {usageChangePercent >= 0 ? '+' : ''}
                  {usageChangePercent.toFixed(1)}%
                </p>
              </div>

              {/* Last 3 Months Total */}
              <div className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-purple-100 rounded-full">
                    <Layers className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    Điện tiêu thụ tháng vừa qua
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {last3MonthsTotal?.thang3.toLocaleString() ?? '-'}
                </p>
                <p className="text-xs text-gray-400">kWh</p>

                {/* Month comparison */}
                {last3MonthsTotal && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">
                          {last3MonthsTotal.thang1Label}:
                        </span>
                        <span className="font-semibold text-gray-700">
                          {last3MonthsTotal.thang1.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">
                          {last3MonthsTotal.thang2Label}:
                        </span>
                        <span className="font-semibold text-gray-700">
                          {last3MonthsTotal.thang2.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">
                          {last3MonthsTotal.thang3Label}:
                        </span>
                        <span className="font-semibold text-gray-700">
                          {last3MonthsTotal.thang3.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {last3MonthsTotal.thang3 >= last3MonthsTotal.thang2 ? (
                        <TrendingUp className="w-3 h-3 text-red-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-green-500" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          last3MonthsTotal.thang3 >= last3MonthsTotal.thang2
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {last3MonthsTotal.thang3 >= last3MonthsTotal.thang2
                          ? '+'
                          : ''}
                        {(
                          ((last3MonthsTotal.thang3 - last3MonthsTotal.thang2) /
                            (last3MonthsTotal.thang2 || 1)) *
                          100
                        ).toFixed(1)}
                        % so với tháng trước
                        <span className="text-xs text-gray-400">
                          (
                          {last3MonthsTotal.thang3 >= last3MonthsTotal.thang2
                            ? '+'
                            : ''}
                          {(
                            last3MonthsTotal.thang3 - last3MonthsTotal.thang2
                          ).toLocaleString()}{' '}
                          kWh)
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-2xl shadow p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Tiêu thụ 7 ngày gần nhất
              </h2>
              <div className="h-40 flex items-end justify-between gap-1.5">
                {dailyUsage.slice(-7).map((item, idx) => {
                  const heightPercent = (item.usage / chartMaxValue) * 100;
                  const isLast = idx === 6;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div className="relative w-full flex items-end justify-center h-32">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isLast
                              ? 'bg-gradient-to-t from-orange-400 to-orange-500'
                              : 'bg-gradient-to-t from-blue-500 to-blue-600'
                          }`}
                          style={{ height: `${Math.max(heightPercent, 8)}%` }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs py-0.5 px-1.5 rounded whitespace-nowrap z-10">
                            {item.usage.toFixed(0)} kWh
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-[10px] font-medium text-gray-600">
                          {formatDateShort(item.date)}
                        </p>
                        <p className="text-[9px] text-gray-400">
                          {getDayOfWeek(item.date)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail List - Mobile Optimized */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <h2 className="text-sm font-semibold text-gray-700">
                  Chi tiết chỉ số hàng ngày
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        Ngày
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        Chỉ số
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        Tiêu thụ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dailyUsage
                      .slice(-7)
                      .reverse()
                      .map((item, idx) => {
                        const isToday = idx === 0;
                        const baseIndex = latestIndex - totalUsage;
                        const currentIndex =
                          baseIndex +
                          dailyUsage
                            .slice(0, dailyUsage.length - idx)
                            .reduce((acc, d) => acc + d.usage, 0);

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-gray-50 transition-colors ${isToday ? 'bg-orange-50' : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {item.date}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {getDayOfWeek(item.date)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <p className="text-sm font-semibold text-gray-700">
                                {currentIndex.toFixed(0)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                  isToday
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                +{item.usage.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Refresh Button - Only show when has access */}
        {hasEvnAccess && (
          <button
            onClick={handleFetchReadings}
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium py-3 rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/30"
          >
            {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
