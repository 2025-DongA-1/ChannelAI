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
    return (numValue / 1_000_000_000_000).toFixed(1) + '조';
  } 
  // 억 단위 (1억 이상)
  else if (absNum >= 100_000_000) {
    return (numValue / 100_000_000).toFixed(1) + '억';
  } 
  // 만 단위 (1만 이상)
  else if (absNum >= 10_000) {
    return (numValue / 10_000).toFixed(1) + '만';
  } 
  // 천 단위 (1천 이상)
  else if (absNum >= 1_000) {
    return (numValue / 1_000).toFixed(1) + 'K';
  }
  
  // 1000 미만은 그대로 표시 (소수점 없이)
  return Math.round(numValue).toLocaleString('ko-KR');
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

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
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
