import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { adminApi } from '../api/admin'
import type { User, CreateUserPayload, UpdateUserPayload } from '../types/auth'

interface Props {
  open: boolean
  onClose: () => void
  user?: User
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
] as const

export default function UserModal({ open, onClose, user }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!user

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'staff' | 'viewer'>('staff')
  const [mustChangePassword, setMustChangePassword] = useState(true)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name)
      setUsername(user.username)
      setPassword('')
      setRole(user.role)
      setMustChangePassword(user.must_change_password)
    } else {
      setFullName('')
      setUsername('')
      setPassword('')
      setRole('staff')
      setMustChangePassword(true)
    }
  }, [user, open])

  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      toast.success('สร้างผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      adminApi.updateUser(id, payload),
    onSuccess: () => {
      toast.success('อัปเดตผู้ใช้สำเร็จ')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit && user) {
      const payload: UpdateUserPayload = {
        full_name: fullName,
        role,
        must_change_password: mustChangePassword,
      }
      if (password) payload.password = password
      updateMutation.mutate({ id: user.id, payload })
    } else {
      const payload: CreateUserPayload = {
        full_name: fullName,
        username,
        password,
        role,
        must_change_password: mustChangePassword,
      }
      createMutation.mutate(payload)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              required={!isEdit}
            />
            {isEdit && (
              <p className="text-xs text-gray-400 mt-1">ไม่สามารถเปลี่ยน username ได้</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสผ่าน {!isEdit && <span className="text-red-500">*</span>}
              {isEdit && <span className="text-gray-400 font-normal">(ปล่อยว่างเพื่อไม่เปลี่ยน)</span>}
            </label>
            <input
              type="password"
              className="input"
              placeholder="อย่างน้อย 8 ตัวอักษร มีตัวเลข 1 ตัว"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'staff' | 'viewer')}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-600"
            />
            <span className="text-sm text-gray-700">บังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 justify-center"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary flex-1 justify-center"
            >
              {isPending ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : isEdit ? (
                'บันทึก'
              ) : (
                'สร้างผู้ใช้'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
