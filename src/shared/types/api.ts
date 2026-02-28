export interface ApiResponse<T> {
  status: number
  message?: string
  data: T
}

export interface ApiError {
  status: number
  message: string
  errors?: Array<{ field: string; message: string }>
}
