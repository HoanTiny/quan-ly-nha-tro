'use client';

import { useState } from 'react';
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
} from 'lucide-react';

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
    // Điện tiêu thụ từ readings[i-1] đến readings[i] là của ngày readings[i-1]
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

function getMonthYear(dateStr: string): string {
  const date = parseDate(dateStr);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}

function calculateMonthlyUsage(
  dailyUsage: { date: string; usage: number }[],
): Record<string, number> {
  const monthly: Record<string, number> = {};
  dailyUsage.forEach((item) => {
    const monthKey = getMonthYear(item.date);
    monthly[monthKey] = (monthly[monthKey] || 0) + item.usage;
  });
  return monthly;
}

function getCurrentMonth(): string {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${String(lastMonth.getMonth() + 1).padStart(2, '0')}/${String(lastMonth.getFullYear()).slice(-2)}`;
}

function getPreviousMonth(): string {
  const now = new Date();
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return `${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}/${String(twoMonthsAgo.getFullYear()).slice(-2)}`;
}

function getMonthName(monthStr: string): string {
  const [month] = monthStr.split('/');
  const monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  return monthNames[parseInt(month) - 1];
}

export default function ElectricityPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvnMeterReadingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<{
    currentMonth: number;
    previousMonth: number;
    twoMonthsAgo: number;
  } | null>(null);

  // padding top cho mobile để không bị header che (mobile bottom nav của dashboard-shell cao ~68px + padding)
  const mobilePaddingTop = "pt-[60px]";

  const currentMonthNum = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const evnCurrentMonth = currentMonthNum;
  const evnPreviousMonth = currentMonthNum - 1;
  const evnTwoMonthsAgo = currentMonthNum - 2;

  const [formData, setFormData] = useState<EvnMeterReadingRequest>({
    customerId: 'PD30000222084',
    maDiemDo: 'PD30000222084001',
    maDonVi: 'HN0100',
    ngayDau: '20/03/2026',
    ngayCuoi: '01/04/2026',
  });

  const handleFetchReadings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await evnApi.getMeterReadings(formData);
      setResult(data);

      setMonthlyLoading(true);

      const currentMonthData = await evnApi.getMonthlyIndex({
        maDViQLy: formData.maDonVi,
        maKhachHang: formData.customerId,
        maDiemDo: formData.maDiemDo,
        nam: currentYear,
        thang: evnCurrentMonth,
      });

      let previousMonthUsage = 0;
      if (evnPreviousMonth >= 0) {
        const previousMonthData = await evnApi.getMonthlyIndex({
          maDViQLy: formData.maDonVi,
          maKhachHang: formData.customerId,
          maDiemDo: formData.maDiemDo,
          nam: currentYear,
          thang: evnPreviousMonth,
        });
        previousMonthUsage =
          previousMonthData.data?.dmChiSoDiemDoList?.[0]?.sanLuong || 0;
      }

      let twoMonthsAgoUsage = 0;
      if (evnTwoMonthsAgo >= 0) {
        const twoMonthsAgoData = await evnApi.getMonthlyIndex({
          maDViQLy: formData.maDonVi,
          maKhachHang: formData.customerId,
          maDiemDo: formData.maDiemDo,
          nam: currentYear,
          thang: evnTwoMonthsAgo,
        });
        twoMonthsAgoUsage =
          twoMonthsAgoData.data?.dmChiSoDiemDoList?.[0]?.sanLuong || 0;
      }

      setMonthlyData({
        currentMonth:
          currentMonthData.data?.dmChiSoDiemDoList?.[0]?.sanLuong || 0,
        previousMonth: previousMonthUsage,
        twoMonthsAgo: twoMonthsAgoUsage,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch meter readings');
    } finally {
      setLoading(false);
      setMonthlyLoading(false);
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

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${mobilePaddingTop} sm:pt-8 py-8`}>
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
            Thông tin tra cứu
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mã khách hàng
              </label>
              <input
                type="text"
                value={formData.customerId}
                onChange={(e) =>
                  setFormData({ ...formData, customerId: e.target.value })
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Mã điểm đo
              </label>
              <input
                type="text"
                value={formData.maDiemDo}
                onChange={(e) =>
                  setFormData({ ...formData, maDiemDo: e.target.value })
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Đơn vị quản lý
              </label>
              <input
                type="text"
                value={formData.maDonVi}
                onChange={(e) =>
                  setFormData({ ...formData, maDonVi: e.target.value })
                }
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                      setFormData({ ...formData, ngayDau: `${day}/${month}/${year}` });
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
                      setFormData({ ...formData, ngayCuoi: `${day}/${month}/${year}` });
                    }
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleFetchReadings}
            disabled={loading}
            className="mt-3 sm:mt-4 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-2.5 sm:py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 text-sm sm:text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Đang tải...
              </span>
            ) : (
              "Xem chỉ số điện"
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
                <h3 className="text-red-800 font-semibold text-sm sm:text-base">Không thể tải dữ liệu</h3>
                <p className="text-red-600 text-xs sm:text-sm mt-0.5">{error}</p>
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
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Chỉ số hiện tại</span>
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full">
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{result.latestIndex?.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">kWh</p>
              </div>

              {/* Total Usage */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Tổng tiêu thụ</span>
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-full">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{result.usage?.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">kWh</p>
              </div>

              {/* Yesterday */}
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">Hôm qua</span>
                  <div className="p-1.5 sm:p-2 bg-orange-100 rounded-full">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">{yesterdayUsage.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">kWh</p>
              </div>

              {/* Day Comparison */}
              <div className={`bg-gradient-to-br rounded-2xl shadow-lg p-4 sm:p-5 border ${
                usageChange >= 0
                  ? "from-red-50 to-orange-50 border-red-200"
                  : "from-green-50 to-emerald-50 border-green-200"
              }`}>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">So với hôm trước</span>
                  <div className={`p-1.5 sm:p-2 rounded-full ${
                    usageChange >= 0 ? "bg-red-100" : "bg-green-100"
                  }`}>
                    {usageChange >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                    )}
                  </div>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${
                  usageChange >= 0 ? "text-red-600" : "text-green-600"
                }`}>
                  {usageChange >= 0 ? "+" : ""}{usageChange.toFixed(1)}
                </p>
                <p className={`text-[10px] sm:text-xs mt-1 ${
                  usageChange >= 0 ? "text-red-500" : "text-green-500"
                }`}>
                  {usageChangePercent >= 0 ? "+" : ""}{usageChangePercent.toFixed(1)}%
                </p>
              </div>

              {/* Month Comparison */}
              <div className={`bg-gradient-to-br rounded-2xl shadow-lg p-4 sm:p-5 border ${
                (monthlyData && monthlyData.currentMonth >= monthlyData.previousMonth)
                  ? "from-purple-50 to-pink-50 border-purple-200"
                  : "from-green-50 to-teal-50 border-green-200"
              }`}>
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Tháng {evnCurrentMonth + 1}
                  </span>
                  <div className={`p-1.5 sm:p-2 rounded-full ${
                    (monthlyLoading || (monthlyData && monthlyData.currentMonth >= monthlyData.previousMonth)) && !monthlyLoading ? "bg-purple-100" : "bg-green-100"
                  }`}>
                    {monthlyLoading ? (
                      <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : monthlyData && monthlyData.currentMonth >= monthlyData.previousMonth ? (
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col">
                  {monthlyLoading ? (
                    <p className="text-lg sm:text-2xl font-bold text-purple-600 animate-pulse">Đang tải...</p>
                  ) : monthlyData ? (
                    <>
                      <p className={`text-lg sm:text-2xl font-bold ${
                        monthlyData.currentMonth >= monthlyData.previousMonth ? "text-purple-600" : "text-green-600"
                      }`}>
                        {monthlyData.currentMonth - monthlyData.previousMonth >= 0 ? "+" : ""}{(monthlyData.currentMonth - monthlyData.previousMonth).toFixed(0)} kWh
                      </p>
                      <p className={`text-[10px] sm:text-xs mt-0.5 ${
                        monthlyData.currentMonth >= monthlyData.previousMonth ? "text-purple-500" : "text-green-500"
                      }`}>
                        {monthlyData.previousMonth > 0
                            ? `${((monthlyData.currentMonth - monthlyData.previousMonth) / monthlyData.previousMonth * 100).toFixed(1)}%`
                            : 'N/A'
                        } vs T{evnPreviousMonth + 1}
                      </p>
                    </>
                  ) : (
                    <p className="text-lg sm:text-2xl font-bold text-gray-400">-</p>
                  )}
                </div>
              </div>
            </div>

            {/* Daily Consumption Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-3 sm:p-6 border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between mb-3 sm:mb-6 gap-2">
                <h2 className="text-sm sm:text-lg font-semibold text-gray-800">Biểu đồ tiêu thụ</h2>
              </div>
              {/* Legend - Hidden on mobile by default */}
              <div className="hidden sm:flex gap-4 mb-4 overflow-hidden">
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
                      ? "from-orange-400 to-orange-500"
                      : isSecondLast
                      ? "from-blue-400 to-blue-500"
                      : "from-blue-600 to-blue-700";

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center min-w-0">
                        <div className="relative w-full flex items-end justify-center h-32 sm:h-44">
                          <div
                            className={`w-full bg-gradient-to-t ${colorClass} rounded-t-lg transition-all duration-300 relative`}
                            style={{ height: `${Math.max(heightPercent, 8)}%`, minWidth: 0 }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] sm:text-xs py-0.5 sm:py-1 px-1.5 sm:px-2 rounded whitespace-nowrap z-10 max-w-full overflow-hidden text-ellipsis">
                              {item.usage.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 sm:mt-2 text-center w-full overflow-hidden">
                          <p className="text-[9px] sm:text-xs font-medium text-gray-700 truncate">{formatDateShort(item.date)}</p>
                          <p className="text-[8px] sm:text-[10px] text-gray-400">{getDayOfWeek(item.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Monthly Consumption Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">Tổng sản lượng tháng</h2>

              {/* Month Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                {/* Current Month */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 sm:p-5 text-white">
                  <div className="absolute -right-3 -top-3 h-16 w-16 sm:h-24 sm:w-24 opacity-20">
                    <Zap className="h-full w-full" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium opacity-80 mb-1">Tháng {evnCurrentMonth + 1}</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {monthlyLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      monthlyData?.currentMonth.toLocaleString() || 0
                    )}
                  </p>
                  <p className="text-xs opacity-75 mt-1">kWh</p>
                </div>

                {/* Previous Month */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 sm:p-5 text-white">
                  <div className="absolute -right-3 -top-3 h-16 w-16 sm:h-24 sm:w-24 opacity-20">
                    <Calendar className="h-full w-full" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium opacity-80 mb-1">Tháng {evnPreviousMonth + 1}</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {monthlyLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      monthlyData?.previousMonth.toLocaleString() || 0
                    )}
                  </p>
                  <p className="text-xs opacity-75 mt-1">kWh</p>
                </div>

                {/* Two Months Ago */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 sm:p-5 text-white">
                  <div className="absolute -right-3 -top-3 h-16 w-16 sm:h-24 sm:w-24 opacity-20">
                    <BarChart3 className="h-full w-full" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium opacity-80 mb-1">Tháng {evnTwoMonthsAgo + 1}</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {monthlyLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      monthlyData?.twoMonthsAgo.toLocaleString() || 0
                    )}
                  </p>
                  <p className="text-xs opacity-75 mt-1">kWh</p>
                </div>
              </div>

              {/* Comparison Bars */}
              <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 sm:mb-4">So sánh tháng</h3>

                {monthlyLoading ? (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="h-10 sm:h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-10 sm:h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                ) : monthlyData ? (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Month-over-month comparison */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-purple-500"></div>
                          <span className="text-[10px] sm:text-sm text-gray-600">T{evnCurrentMonth + 1}</span>
                        </div>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
                          <span className="text-[10px] sm:text-sm text-gray-600">T{evnPreviousMonth + 1}</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full flex-shrink-0 ${
                        monthlyData.currentMonth >= monthlyData.previousMonth
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {monthlyData.currentMonth >= monthlyData.previousMonth ? (
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                        ) : (
                          <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        <span className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                          {Math.abs(monthlyData.currentMonth - monthlyData.previousMonth).toLocaleString()} kWh
                        </span>
                      </div>
                    </div>

                    {/* Month over 2 months ago comparison */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-purple-500"></div>
                          <span className="text-[10px] sm:text-sm text-gray-600">T{evnCurrentMonth + 1}</span>
                        </div>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] sm:text-sm text-gray-600">T{evnTwoMonthsAgo + 1}</span>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full flex-shrink-0 ${
                        monthlyData.currentMonth >= monthlyData.twoMonthsAgo
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {monthlyData.currentMonth >= monthlyData.twoMonthsAgo ? (
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                        ) : (
                          <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        <span className="text-[10px] sm:text-sm font-semibold whitespace-nowrap">
                          {Math.abs(monthlyData.currentMonth - monthlyData.twoMonthsAgo).toLocaleString()} kWh
                        </span>
                      </div>
                    </div>

                    {/* Percentage change */}
                    <div className="pt-2 sm:pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-sm text-gray-500">Biến động so với tháng trước</span>
                        <span className={`text-xs sm:text-sm font-semibold ${
                          monthlyData.currentMonth >= monthlyData.previousMonth
                            ? "text-red-600"
                            : "text-green-600"
                        }`}>
                          {monthlyData.previousMonth > 0
                            ? `${((monthlyData.currentMonth - monthlyData.previousMonth) / monthlyData.previousMonth * 100).toFixed(1)}%`
                            : 'N/A'
                        }
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs sm:text-sm text-center py-3 sm:py-4">Chưa có dữ liệu</p>
                )}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="px-3 py-3 sm:px-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">Chi tiết chỉ số hàng ngày</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 sm:px-6 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ngày</th>
                      <th className="px-3 py-2 sm:px-6 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Chỉ số</th>
                      <th className="px-3 py-2 sm:px-6 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Tiêu thụ (kWh)</th>
                      <th className="px-3 py-2 sm:px-6 text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Thứ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.readings.map((reading, idx) => {
                      // Usage là điện tiêu thụ của ngày TRƯỚC đó (từ idx đến idx+1)
                      const nextReading = result.readings[idx + 1];
                      const usage = nextReading ? nextReading.value - reading.value : 0;
                      const isLastDay = idx === result.readings.length - 1;
                      const isToday = idx === result.readings.length - 2; // Ngày có reading cuối cùng thực tế là hôm qua

                      // Không hiển thị dòng cuối cùng vì không có usage
                      if (isLastDay) return null;

                      return (
                        <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isToday ? "bg-orange-50" : ""}`}>
                          <td className="px-3 py-2 sm:px-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-900">{reading.date}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 sm:px-6 whitespace-nowrap text-right">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900">{reading.value.toLocaleString()}</p>
                          </td>
                          <td className="px-3 py-2 sm:px-6 whitespace-nowrap text-right">
                            {usage > 0 ? (
                              <span className={`inline-flex items-center px-2 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                                isToday
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-green-100 text-green-800"
                              }`}>
                                +{usage.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs sm:text-sm">-</span>
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
