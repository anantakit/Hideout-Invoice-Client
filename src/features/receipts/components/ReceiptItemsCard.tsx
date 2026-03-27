import { formatTHB } from '@/shared/utils'
import { Card, CardHeader } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface ReceiptItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface ReceiptItemsCardProps {
  items: ReceiptItem[]
  total: number
}

export function ReceiptItemsCard({ items, total }: ReceiptItemsCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow duration-200 md:hover:shadow-md">
      <CardHeader className="py-4 px-5 md:px-8 border-b border-border">
        <h2 className="text-body font-medium text-foreground">รายการ</h2>
      </CardHeader>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รายละเอียด</TableHead>
              <TableHead className="text-center">จำนวนคืน</TableHead>
              <TableHead className="text-right">ราคาต่อคืน (บาท)</TableHead>
              <TableHead className="text-right">รวมเงิน</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-foreground/80">{item.description}</TableCell>
                <TableCell className="text-center text-muted-foreground">{item.quantity}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatTHB(item.unit_price)}</TableCell>
                <TableCell className="text-right font-medium text-foreground">{formatTHB(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="sm:hidden divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-3 space-y-1">
            <p className="text-sm font-medium text-foreground">{item.description}</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{item.quantity} คืน × {formatTHB(item.unit_price)}</span>
              <span className="font-medium text-foreground">{formatTHB(item.total)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 md:px-8 py-4 border-t border-border bg-muted/20">
        <div className="flex justify-between items-center max-w-xs ml-auto">
          <span className="text-sm font-medium text-foreground">ยอดชำระทั้งหมด</span>
          <span className="text-base font-semibold text-primary">{formatTHB(total)}</span>
        </div>
      </div>
    </Card>
  )
}
