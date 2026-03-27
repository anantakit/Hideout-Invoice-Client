import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi } from '../api'

export function useUpdateRevenueTarget(ceYear: number) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: ({ month, amount }: { month: number; amount: number }) =>
      dashboardApi.upsertRevenueTarget(ceYear, month, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return { mutate, isPending }
}
