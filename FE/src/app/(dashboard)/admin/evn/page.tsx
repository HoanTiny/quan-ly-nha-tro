'use client';

import { useState, useEffect } from 'react';
import {
  evnApi,
  EvnMeterReadingRequest,
  EvnMeterReadingResponse,
  DailyReading,
} from '@/lib/api/evn';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  AlertCircle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function formatDateShort(dateStr: string): string {
  const date = parseDate(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateVN(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function calculateDailyUsage(
  readings: DailyReading[],
): { date: string; usage: number }[] {
  const usage: { date: string; usage: number }[] = [];
  for (let i = 1; i < readings.length; i++) {
    usage.push({
      date: readings[i - 1].date,
      usage: readings[i].value - readings[i - 1].value,
    });
  }
  return usage;
}

function getDayOfWeek(dateStr: string): string {
  const date = parseDate(dateStr);
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[date.getDay()];
}

function getLast7DaysDateRange(): { ngayDau: string; ngayCuoi: string } {
  const today = new Date();
  // Hôm qua
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // 7 ngày trước hôm qua
  const startDate = new Date(yesterday);
  startDate.setDate(yesterday.getDate() - 6);

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return {
    ngayDau: formatDate(startDate),
    ngayCuoi: formatDate(yesterday),
  };
}

export default function ElectricityPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvnMeterReadingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Credentials check state
  const [credentials, setCredentials] = useState<{
    hasCredentials: boolean;
    customerId?: string;
    maDiemDo?: string;
    maDonVi?: string;
  } | null>(null);
  const [credentialsChecked, setCredentialsChecked] = useState(false);

  const [formData, setFormData] = useState<EvnMeterReadingRequest>(() => ({
    customerId: 'PD30000222084',
    maDiemDo: 'PD30000222084001',
    maDonVi: 'HN0100',
    ...getLast7DaysDateRange(),
  }));

  // Check credentials on mount and auto-fill + auto-fetch
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const data = await evnApi.getCredentials();
        setCredentials({
          hasCredentials: data.hasCredentials,
          customerId: data.customerId,
          maDiemDo: data.maDiemDo,
          maDonVi: data.maDonVi,
        });

        // Auto-fill form with credentials data
        if (data.hasCredentials) {
          setFormData((prev) => ({
            ...prev,
            customerId: data.customerId || prev.customerId,
            maDiemDo: data.maDiemDo || prev.maDiemDo,
            maDonVi: data.maDonVi || prev.maDonVi,
          }));

          // Auto-fetch readings with default 7 days
          const dateRange = getLast7DaysDateRange();
          await handleFetchReadings(
            data.customerId || 'PD30000222084',
            data.maDiemDo || 'PD30000222084001',
            data.maDonVi || 'HN0100',
            dateRange.ngayDau,
            dateRange.ngayCuoi,
          );

          // Fetch last 3 months total
          try {
            const totalData = await evnApi.getLast3MonthsTotal();
            console.log('Last 3 months total:', totalData);
            setLast3MonthsTotal(totalData);
          } catch (err) {
            console.error('Failed to fetch last 3 months total:', err);
          }
        }
      } catch (err: any) {
        // If check fails, still allow user to try fetching
        console.error('Failed to check credentials:', err);
      } finally {
        setCredentialsChecked(true);
      }
    };
    checkCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetchReadings = async (
    customerId?: string,
    maDiemDo?: string,
    maDonVi?: string,
    ngayDau?: string,
    ngayCuoi?: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await evnApi.getMeterReadings({
        customerId: customerId || formData.customerId,
        maDiemDo: maDiemDo || formData.maDiemDo,
        maDonVi: maDonVi || formData.maDonVi,
        ngayDau: ngayDau || formData.ngayDau,
        ngayCuoi: ngayCuoi || formData.ngayCuoi,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch meter readings');
    } finally {
      setLoading(false);
    }
  };

  const dailyUsage = result?.readings
    ? calculateDailyUsage(result.readings)
    : [];

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

  const mobilePaddingTop = 'pt-[60px]';

  // Show loading while checking credentials
  if (!credentialsChecked) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${mobilePaddingTop} sm:pt-8 py-8`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show no credentials message
  if (!credentials?.hasCredentials) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${mobilePaddingTop} sm:pt-8 py-8`}
      >
        <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Tiền Điện
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Theo dõi chỉ số điện từ EVN
                </p>
              </div>
            </div>
          </div>

          {/* No Credentials Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full flex-shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-yellow-800 font-semibold text-sm sm:text-base mb-2">
                  Chưa cấu hình EVN
                </h3>
                <p className="text-yellow-600 text-xs sm:text-sm mb-4">
                  Để xem chỉ số điện, vui lòng thiết lập thông tin tài khoản EVN
                  trong trang quản lý.
                </p>
                <Link href="/admin/electricity" className="inline-block">
                  <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                    <span className="flex items-center gap-2">
                      Đi đến cài đặt
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${mobilePaddingTop} sm:pt-8 py-8`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl shadow-lg">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                Tiền Điện
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Theo dõi chỉ số điện từ EVN
              </p>
            </div>
          </div>
        </div>

        {/* Request Form */}
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            Chọn khoảng thời gian
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={formData.ngayDau.split('/').reverse().join('-')}
                onChange={(e) => {
                  const date = e.target.value;
                  if (date) {
                    const [year, month, day] = date.split('-');
                    setFormData({
                      ...formData,
                      ngayDau: `${day}/${month}/${year}`,
                    });
                  }
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={formData.ngayCuoi.split('/').reverse().join('-')}
                onChange={(e) => {
                  const date = e.target.value;
                  if (date) {
                    const [year, month, day] = date.split('-');
                    setFormData({
                      ...formData,
                      ngayCuoi: `${day}/${month}/${year}`,
                    });
                  }
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <button
            onClick={() => handleFetchReadings()}
            disabled={loading}
            className="mt-3 sm:mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-2.5 sm:py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 text-sm sm:text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang tải...
              </span>
            ) : (
              'Xem chỉ số điện'
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 sm:p-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-red-800 font-semibold text-sm sm:text-base">
                  Không thể tải dữ liệu
                </h3>
                <p className="text-red-600 text-xs sm:text-sm mt-0.5">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4 sm:space-y-6">
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Latest Index */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Chỉ số hiện tại
                  </span>
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full">
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {result.latestIndex?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">kWh</p>
              </div>

              {/* Total Usage */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Tổng tiêu thụ
                  </span>
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-full">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {result.usage?.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">kWh</p>
              </div>

              {/* Yesterday */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Hôm qua
                  </span>
                  <div className="p-1.5 sm:p-2 bg-orange-100 rounded-full">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {yesterdayUsage.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400 mt-1">kWh</p>
              </div>

              {/* Day Comparison */}
              <div
                className={`bg-gradient-to-br rounded-2xl shadow-lg p-4 sm:p-5 border ${
                  usageChange >= 0
                    ? 'from-red-50 to-orange-50 border-red-200'
                    : 'from-green-50 to-emerald-50 border-green-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    So với hôm trước
                  </span>
                  <div
                    className={`p-1.5 sm:p-2 rounded-full ${
                      usageChange >= 0 ? 'bg-red-100' : 'bg-green-100'
                    }`}
                  >
                    {usageChange >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-2xl sm:text-3xl font-bold ${
                    usageChange >= 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {usageChange >= 0 ? '+' : ''}
                  {usageChange.toFixed(1)}
                </p>
                <p
                  className={`text-[10px] sm:text-xs mt-1 ${
                    usageChange >= 0 ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  {usageChangePercent >= 0 ? '+' : ''}
                  {usageChangePercent.toFixed(1)}%
                </p>
              </div>

              {/* Last 3 Months Total */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Điện tiêu thụ tháng vừa qua
                  </span>
                  <div className="p-1.5 sm:p-2 bg-purple-100 rounded-full">
                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {last3MonthsTotal?.thang3.toLocaleString() ?? '-'}
                </p>
                <p className="text-xs text-gray-400 mt-1">kWh</p>

                {/* Month comparison */}
                {last3MonthsTotal && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          {last3MonthsTotal.thang1Label || '2 tháng trước'}:
                        </span>
                        <span className="font-semibold text-gray-700">
                          {last3MonthsTotal.thang1.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          {last3MonthsTotal.thang2Label || 'Tháng trước'}:
                        </span>
                        <span className="font-semibold text-gray-700">
                          {last3MonthsTotal.thang2.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">
                          {last3MonthsTotal.thang3Label || 'Tháng này'}:
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
                        %
                      </span>
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
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Daily Consumption Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-6 border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between mb-3 sm:mb-6 gap-2">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-800">
                  Biểu đồ tiêu thụ
                </h2>
              </div>
              {/* Legend */}
              <div className="flex gap-4 mb-4 overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></div>
                  <span className="text-xs text-gray-500">Hôm qua</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0"></div>
                  <span className="text-xs text-gray-500">Hôm trước</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0"></div>
                  <span className="text-xs text-gray-500">Các ngày khác</span>
                </div>
              </div>
              <div className="h-40 sm:h-56 w-full overflow-hidden">
                <div className="h-full flex items-end justify-between gap-1">
                  {dailyUsage.map((item, idx) => {
                    const heightPercent = (item.usage / chartMaxValue) * 100;
                    const isLast = idx === dailyUsage.length - 1;
                    const isSecondLast = idx === dailyUsage.length - 2;
                    const colorClass = isLast
                      ? 'from-orange-400 to-orange-500'
                      : isSecondLast
                        ? 'from-blue-400 to-blue-500'
                        : 'from-blue-600 to-blue-700';

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center min-w-0"
                      >
                        <div className="relative w-full flex items-end justify-center h-32 sm:h-44">
                          <div
                            className={`w-full bg-gradient-to-t ${colorClass} rounded-t-lg transition-all duration-300 relative`}
                            style={{
                              height: `${Math.max(heightPercent, 8)}%`,
                              minWidth: 0,
                            }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] sm:text-xs py-0.5 sm:py-1 px-1.5 sm:px-2 rounded whitespace-nowrap z-10 max-w-full overflow-hidden text-ellipsis">
                              {item.usage.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 sm:mt-2 text-center w-full overflow-hidden">
                          <p className="text-[9px] sm:text-xs font-medium text-gray-700 truncate">
                            {formatDateShort(item.date)}
                          </p>
                          <p className="text-[8px] sm:text-[10px] text-gray-400">
                            {getDayOfWeek(item.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="px-3 py-3 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                  Chi tiết chỉ số hàng ngày
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 sm:px-6 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Ngày
                      </th>
                      <th className="px-3 py-2 sm:px-6 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Chỉ số
                      </th>
                      <th className="px-3 py-2 sm:px-6 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Tiêu thụ (kWh)
                      </th>
                      <th className="px-3 py-2 sm:px-6 text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Thứ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.readings.map((reading, idx) => {
                      const nextReading = result.readings[idx + 1];
                      const usage = nextReading
                        ? nextReading.value - reading.value
                        : 0;
                      const isLastDay = idx === result.readings.length - 1;
                      const isToday = idx === result.readings.length - 2;

                      if (isLastDay) return null;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-gray-50 transition-colors ${isToday ? 'bg-orange-50' : ''}`}
                        >
                          <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-900">
                                  {reading.date}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 sm:px-6 whitespace-nowrap text-right">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900">
                              {reading.value.toLocaleString()}
                            </p>
                          </td>
                          <td className="px-3 py-2 sm:px-6 whitespace-nowrap text-right">
                            {usage > 0 ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                                  isToday
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                +{usage.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs sm:text-sm">
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 sm:px-6 whitespace-nowrap text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-100 text-[10px] sm:text-xs font-medium text-gray-600">
                              {getDayOfWeek(reading.date)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* Padding bottom cho mobile nav */}
        <div className="h-[76px] lg:h-0"></div>
      </div>
    </div>
  );
}
