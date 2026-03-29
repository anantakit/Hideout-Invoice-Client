import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { useAuth } from '@/app/providers/AuthProvider'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { Logo } from '@/shared/components/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'

const schema = z.object({
  username: z.string().min(1, 'กรุณาระบุชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณาระบุรหัสผ่าน'),
})

type FormValues = z.infer<typeof schema>

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/timeline'

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.must_change_password) {
        navigate('/change-password', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate, from])

  if (isAuthenticated) {
    return null
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await login({ username: values.username.trim(), password: values.password })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3">
            <Logo className="w-12 h-12" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Hideout Resort</h1>
          <p className="text-helper mt-1">Hotel Operations</p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-section">เข้าสู่ระบบ</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อผู้ใช้</FormLabel>
                      <FormControl>
                        <Input placeholder="ชื่อผู้ใช้" autoComplete="username" autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>รหัสผ่าน</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full touch-target radius-card font-medium mt-2 transition-transform duration-150 active:scale-[0.98]"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : 'เข้าสู่ระบบ'
                  }
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
