export interface User {
  id: string
  full_name: string
  username: string
  role: 'admin' | 'staff' | 'viewer'
  must_change_password: boolean
  created_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface CreateUserPayload {
  full_name: string
  username: string
  password: string
  role: 'admin' | 'staff' | 'viewer'
  must_change_password: boolean
}

export interface UpdateUserPayload {
  full_name?: string
  password?: string
  role?: 'admin' | 'staff' | 'viewer'
  must_change_password?: boolean
}
