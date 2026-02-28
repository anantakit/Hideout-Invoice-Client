import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invoicesApi, type InvoiceQueryParams } from '../api';
import { formatTHB, formatThaiDate } from '../../../shared/utils';
import { usePaginatedQuery } from '../../../shared/hooks/usePaginatedQuery';
import Pagination from '../../../shared/ui/Pagination';

async function downloadInvoice(id: string, number: string) {
  try {
    await invoicesApi.download(id, `${number}.pdf`);
  } catch {
    toast.error('ดาวน์โหลดไม่สำเร็จ');
  }
}

export default function InvoiceHistory() {
  const queryClient = useQueryClient();

  const { page, limit, searchInput, params: paginationParams, setPage, setLimit, setSearchInput } =
    usePaginatedQuery({ defaultLimit: 20 });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (id: string, number: string) => {
    setDownloadingId(id);
    await downloadInvoice(id, number);
    setDownloadingId(null);
  };

  const params: InvoiceQueryParams = {
    ...paginationParams,
    ...(startDate && { start_date: startDate }),
    ...(endDate && { end_date: endDate }),
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => invoicesApi.list(params),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: invoicesApi.delete,
    onSuccess: () => {
      toast.success('ลบใบเสร็จสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = (id: string, number: string) => {
    if (!confirm(`ลบใบเสร็จ ${number}? การกระทำนี้ไม่สามารถย้อนกลับได้`))
      return;
    deleteMutation.mutate(id);
  };

  const handleFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const meta = data?.meta;
  const totalPages = meta?.total_pages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายการใบเสร็จ</h1>
          <p className="text-gray-500 text-sm mt-1">
            {data ? `ใบเสร็จทั้งหมด ${total} รายการ` : 'กำลังโหลด…'}
          </p>
        </div>
        <Link to="/invoices/new" className="btn-primary hidden sm:inline-flex">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          สร้างใบเสร็จ
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search */}
          <div className="relative w-full">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า, เลขห้อง หรือเลขที่ใบเสร็จ"
              className="input pl-9 h-11 w-full"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Date Range */}
          <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[320px]">
            <span className="text-sm font-medium text-gray-600">
              ช่วงวันที่ออกใบเสร็จ
            </span>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="date"
                className="input h-11 w-full"
                value={startDate}
                onChange={(e) =>
                  handleFilterChange(() => setStartDate(e.target.value))
                }
              />

              <span className="hidden sm:block text-gray-400">—</span>

              <input
                type="date"
                className="input h-11 w-full"
                value={endDate}
                onChange={(e) =>
                  handleFilterChange(() => setEndDate(e.target.value))
                }
              />
            </div>
          </div>
        </div>

        {(searchInput || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Content */}
      <div className="card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg
              className="w-12 h-12 mb-3 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">
              {searchInput || startDate || endDate
                ? 'ไม่พบใบเสร็จที่ตรงกับเงื่อนไข'
                : 'ยังไม่มีใบเสร็จ'}
            </p>
            {!searchInput && !startDate && !endDate && (
              <Link to="/invoices/new" className="btn-primary mt-4 text-xs">
                สร้างใบเสร็จแรก
              </Link>
            )}
          </div>
        ) : (
          <div
            className={`transition-opacity duration-150 ${isFetching ? 'opacity-60' : 'opacity-100'}`}
          >
            {/* Desktop table */}
            <table className="w-full text-sm hidden sm:table">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    เลขที่ใบเสร็จ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ลูกค้า
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    วันที่ออกเอกสาร
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ยอดรวม
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="font-semibold text-brand-600 hover:text-brand-700"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {inv.customer?.name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden md:table-cell">
                      {formatThaiDate(inv.issue_date)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatTHB(inv.total)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(inv.id, inv.invoice_number)
                          }
                          disabled={downloadingId === inv.id}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors disabled:opacity-40"
                          title="ดาวน์โหลด PDF"
                        >
                          {downloadingId === inv.id ? (
                            <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(inv.id, inv.invoice_number)
                          }
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="ลบ"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-100">
              {data.data.map((inv) => (
                <div
                  key={inv.id}
                  className="px-4 py-4 flex items-center justify-between gap-3"
                >
                  <Link to={`/invoices/${inv.id}`} className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-600 text-sm truncate">
                      {inv.invoice_number}
                    </p>
                    <p className="text-sm text-gray-700 truncate mt-0.5">
                      {inv.customer?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatThaiDate(inv.issue_date)}
                    </p>
                  </Link>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-gray-900 text-sm">
                      {formatTHB(inv.total)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(inv.id, inv.invoice_number)
                        }
                        disabled={downloadingId === inv.id}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-brand-600 transition-colors disabled:opacity-40"
                        title="ดาวน์โหลด PDF"
                      >
                        {downloadingId === inv.id ? (
                          <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="ลบ"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      <Link
        to="/invoices/new"
        className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-700 active:bg-brand-900 transition-colors"
        aria-label="สร้างใบเสร็จ"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </Link>
    </div>
  );
}
