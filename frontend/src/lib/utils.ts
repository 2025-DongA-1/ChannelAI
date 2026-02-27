import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function formatCompactNumber(num: number | string): string {
  // null, undefined 체크
  if (num === null || num === undefined) return '0';
  
  // 문자열인 경우 parseFloat으로 변환
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  
  // NaN이거나 유효하지 않은 숫자인 경우
  if (isNaN(numValue) || !isFinite(numValue)) return '0';
  
  const absNum = Math.abs(numValue);
  
  // 조 단위 (1조 이상)
  if (absNum >= 1_000_000_000_000) {
    return (numValue / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + '조';
  } 
  // 억 단위 (1억 이상)
  else if (absNum >= 100_000_000) {
    return (numValue / 100_000_000).toFixed(1).replace(/\.0$/, '') + '억';
  } 
  // 만 단위 (1만 이상)
  else if (absNum >= 10_000) {
    return (numValue / 10_000).toFixed(1).replace(/\.0$/, '') + '만';
  } 
  
  // 1만 미만은 K 대신 그냥 천 단위 콤마 찍어서 표시!
  return new Intl.NumberFormat('ko-KR').format(numValue);
}

export function formatCurrency(amount: number, currency: string = 'KRW'): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₩0';
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    draft: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] || colors.draft;
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    GOOGLE: 'bg-blue-100 text-blue-800 border-blue-200',
    META: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    NAVER: 'bg-green-100 text-green-800 border-green-200',
    KARROT: 'bg-orange-100 text-orange-800 border-orange-200',
    google: 'bg-blue-100 text-blue-800 border-blue-200',
    meta: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    naver: 'bg-green-100 text-green-800 border-green-200',
    karrot: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  return colors[platform] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    GOOGLE: 'Google Ads',
    META: 'Meta Ads',
    NAVER: 'Naver Ads',
    KARROT: '당근마켓 비즈니스',
    google: 'Google Ads',
    meta: 'Meta Ads',
    naver: 'Naver Ads',
    karrot: '당근마켓 비즈니스',
  };
  return names[platform] || platform;
}

export function calculateROAS(revenue: number, cost: number): number {
  return cost > 0 ? revenue / cost : 0;
}

export function calculateCTR(clicks: number, impressions: number): number {
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
}

export function calculateCPC(cost: number, clicks: number): number {
  return clicks > 0 ? cost / clicks : 0;
}

// 기간 계산 함수
export function getComparisonText(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''; // '전체' 기간일 때는 빈 문자열 반환

  const start = new Date(startDate);
  const end = new Date(endDate);

  // 선택한 기간이 총 며칠인지 계산 (종료일 포함이므로 +1)
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // 직전 기간의 끝나는 날 = 선택한 시작일의 하루 전
  const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  // 직전 기간의 시작일 = 직전 종료일에서 (기간-1)만큼 뺀 날짜
  const prevStart = new Date(prevEnd.getTime() - (diffDays - 1) * 24 * 60 * 60 * 1000);

  // 날짜를 YYYY.MM.DD 형식으로 예쁘게 바꿔주는 내부 함수
  const formatDt = (date: Date) => {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return `직전 동기간 (${formatDt(prevStart)} ~ ${formatDt(prevEnd)}) 대비`;
}

// 1. 이전 날짜 계산기 (서버에 요청할 YYYY-MM-DD 형식으로 만들어줘요)
export function getPreviousDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - (diffDays - 1) * 24 * 60 * 60 * 1000);

  const formatDt = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return {
    startDate: formatDt(prevStart),
    endDate: formatDt(prevEnd)
  };
}

// 2. 퍼센트 계산기 (현재 값과 이전 값을 넣으면 %를 뱉어내요)
export function calculateChangeRate(current?: number, previous?: number): number | undefined {
  if (current === undefined || previous === undefined) return undefined;
  if (previous === 0) return current > 0 ? 100 : 0; // 예전 데이터가 0일 때 에러 안 나게 방어!
  return Number((((current - previous) / previous) * 100).toFixed(1));
}