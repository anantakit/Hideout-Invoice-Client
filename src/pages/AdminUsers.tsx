import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '../api/admin'
import { useAuth } from '../context/AuthContext'
import UserModal from '../components/UserModal'
import type { User } from '../types/auth'
import { formatThaiDate } from '../lib/utils'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'badge-blue',
  staff: 'bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full',
  viewer: 'bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full',
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.listUsers,
  })

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      toast.success('ลบผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleDelete = (user: User) => {
    if (user.id === me?.id) {
      toast.error('ไม่สามารถลบบัญชีของตนเองได้')
      return
    }
    if (!confirm(`ลบผู้ใช้ "${user.full_name}" (${user.username})?`)) return
    deleteMutation.mutate(user.id)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditingUser(undefined)
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
            <p className="text-gray-500 text-sm mt-1">
              {users ? `ผู้ใช้ทั้งหมด ${users.length} คน` : 'กำลังโหลด…'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingUser(undefined); setModalOpen(true) }}
            className="btn-primary hidden sm:inline-flex"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มผู้ใช้
          </button>
        </div>

        <div className="card overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">ยังไม่มีผู้ใช้</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    ชื่อ / Username
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    วันที่สร้าง
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <p className="font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">@{u.username}</p>
                      {u.must_change_password && (
                        <span className="text-xs text-amber-600">ต้องเปลี่ยนรหัสผ่าน</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={ROLE_COLORS[u.role] ?? 'badge-blue'}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-gray-500 hidden md:table-cell">
                      {formatThaiDate(u.created_at)}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(u)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title="แก้ไข"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          disabled={u.id === me?.id}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={() => { setEditingUser(undefined); setModalOpen(true) }}
        className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-700 active:bg-brand-900 transition-colors"
        aria-label="เพิ่มผู้ใช้"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <UserModal open={modalOpen} onClose={handleClose} user={editingUser} />
    </>
  )
}
