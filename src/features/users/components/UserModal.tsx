import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { adminApi } from '../api'
import type { User, CreateUserPayload, UpdateUserPayload } from '../../../shared/types/auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../shared/ui/dialog'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Label } from '../../../shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select'

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
      const payload: UpdateUserPayload = { full_name: fullName, role, must_change_password: mustChangePassword }
      if (password) payload.password = password
      updateMutation.mutate({ id: user.id, payload })
    } else {
      const payload: CreateUserPayload = { full_name: fullName, username, password, role, must_change_password: mustChangePassword }
      createMutation.mutate(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">ชื่อ-นามสกุล <span className="text-destructive">*</span></Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isEdit}
                required={!isEdit}
              />
              {isEdit && <p className="text-xs text-muted-foreground">ไม่สามารถเปลี่ยน username ได้</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                รหัสผ่าน {!isEdit && <span className="text-destructive">*</span>}
                {isEdit && <span className="text-muted-foreground font-normal"> (ปล่อยว่างเพื่อไม่เปลี่ยน)</span>}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="อย่างน้อย 8 ตัวอักษร มีตัวเลข 1 ตัว"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'staff' | 'viewer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mustChangePassword}
                onChange={(e) => setMustChangePassword(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-sm text-foreground">บังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</span>
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'บันทึก' : 'สร้างผู้ใช้'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
