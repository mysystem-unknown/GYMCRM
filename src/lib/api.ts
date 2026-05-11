export async function fetchAPI<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'API error');
  }
  return res.json();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400';
    case 'Expiring Soon': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400';
    case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400';
    case 'Refunded': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-400';
  }
}

export function getDaysUntilExpiry(expiryDate: string): number {
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      const str = typeof val === 'string' ? val.replace(/"/g, '""') : String(val ?? '');
      return `"${str}"`;
    }).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
