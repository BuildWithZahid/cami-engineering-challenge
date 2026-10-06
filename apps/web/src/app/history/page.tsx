'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchHistory } from '@/lib/api';

const CATEGORIES = ['', 'billing', 'sales', 'support', 'unknown'] as const;

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

export default function HistoryPage() {
  const [category, setCategory] = useState('');
  const historyQuery = useQuery({
    queryKey: ['history', category],
    queryFn: () => fetchHistory(category || undefined),
  });

  const items = historyQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Classification history</h2>
        <p className="mt-1 text-sm text-slate-600">
          Each Classify click appends a row. Filter by category; provider is stored so a
          later LLM adapter can sit behind the same interface.
        </p>
      </div>

      <label className="flex max-w-sm flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Filter by category</span>
        <select
          className="rounded border border-slate-300 bg-white px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((value) => (
            <option key={value || 'all'} value={value}>
              {value || 'All categories'}
            </option>
          ))}
        </select>
      </label>

      {historyQuery.isLoading ? (
        <p className="text-slate-600">Loading…</p>
      ) : historyQuery.isError ? (
        <p className="text-red-700">Failed to load history.</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No classifications yet. Classify a request from the desk to populate this list.
          Seeded requests are not backfilled.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="max-w-md px-4 py-3 font-medium text-slate-900">{row.message}</td>
                  <td className="px-4 py-3">
                    {row.category}
                    <span className="ml-1 text-xs text-slate-500">
                      ({row.confidence.toFixed(2)})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
