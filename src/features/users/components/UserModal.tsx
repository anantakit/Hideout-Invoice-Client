import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import type { User, CreateUserPayload, UpdateUserPayload } from '@/shared/types/auth'
import { useCreateUser } from '../hooks/useCreateUser'
import { useUpdateUser } from '../hooks/useUpdateUser'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/shared/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

interface Props {
  open: boolean
  onClose: () => void
  user?: User
}

const ROLES = [
  { value: 'admin', label: 'ผู้ดูแลระบบ' },
  { value: 'staff', label: 'พนักงาน' },
  { value: 'viewer', label: 'ผู้ชม' },
] as const

const userSchema = (isEdit: boolean) =>
  z.object({
    full_name: z.string().min(1, 'กรุณาระบุชื่อ-นามสกุล'),
    username: isEdit ? z.string() : z.string().min(1, 'กรุณาระบุ username'),
    password: isEdit
      ? z.string().refine(
          (v) => v === '' || (v.length >= 8 && /\d/.test(v)),
          'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวเลขอย่างน้อย 1 ตัว',
        )
      : z
          .string()
          .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
          .regex(/\d/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'),
    role: z.enum(['admin', 'staff', 'viewer']),
    must_change_password: z.boolean(),
  })

type UserFormValues = z.infer<ReturnType<typeof userSchema>>

export default function UserModal({ open, onClose, user }: Props) {
  const isEdit = !!user

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema(isEdit)),
    defaultValues: {
      full_name: '',
      username: '',
      password: '',
      role: 'staff',
      must_change_password: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        user
          ? { full_name: user.full_name, username: user.username, password: '', role: user.role, must_change_password: user.must_change_password }
          : { full_name: '', username: '', password: '', role: 'staff', must_change_password: true },
      )
    }
  }, [user, open, form])

  const { mutate: createUser, isPending: isCreating } = useCreateUser(onClose)
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser(onClose)
  const isPending = isCreating || isUpdating

  function onSubmit(values: UserFormValues) {
    if (isEdit && user) {
      const payload: UpdateUserPayload = { full_name: values.full_name, role: values.role, must_change_password: values.must_change_password }
      if (values.password) payload.password = values.password
      updateUser({ id: user.id, payload })
    } else {
      const payload: CreateUserPayload = { full_name: values.full_name, username: values.username, password: values.password, role: values.role, must_change_password: values.must_change_password }
      createUser(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="px-6 py-4 space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isEdit} />
                    </FormControl>
                    {isEdit && <p className="text-helper">ไม่สามารถเปลี่ยนชื่อผู้ใช้ได้</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      รหัสผ่าน {!isEdit && <span className="text-destructive">*</span>}
                      {isEdit && <span className="text-muted-foreground font-normal"> (ปล่อยว่างเพื่อไม่เปลี่ยน)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="อย่างน้อย 8 ตัวอักษร มีตัวเลข 1 ตัว"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="must_change_password"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-body text-foreground">บังคับเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</span>
                  </label>
                )}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'บันทึก' : 'สร้างผู้ใช้'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
