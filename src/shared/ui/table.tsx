import * as React from 'react'
import { cn } from '@/shared/utils'

function Table({ className, ref, ...props }: React.HTMLAttributes<HTMLTableElement> & { ref?: React.Ref<HTMLTableElement> }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { ref?: React.Ref<HTMLTableSectionElement> }) {
  return <thead ref={ref} className={cn('bg-sidebar border-b border-border-soft', className)} {...props} />
}

function TableBody({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { ref?: React.Ref<HTMLTableSectionElement> }) {
  return <tbody ref={ref} className={cn('divide-y divide-border-soft', className)} {...props} />
}

function TableFooter({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & { ref?: React.Ref<HTMLTableSectionElement> }) {
  return <tfoot ref={ref} className={cn('border-t border-border-soft bg-sidebar font-medium', className)} {...props} />
}

function TableRow({ className, ref, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { ref?: React.Ref<HTMLTableRowElement> }) {
  return (
    <tr
      ref={ref}
      className={cn('transition-colors hover:bg-accent/60 data-[state=selected]:bg-accent', className)}
      {...props}
    />
  )
}

function TableHead({ className, ref, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { ref?: React.Ref<HTMLTableCellElement> }) {
  return (
    <th
      ref={ref}
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wide [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ref, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { ref?: React.Ref<HTMLTableCellElement> }) {
  return (
    <td
      ref={ref}
      className={cn('px-4 py-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
}

function TableCaption({ className, ref, ...props }: React.HTMLAttributes<HTMLTableCaptionElement> & { ref?: React.Ref<HTMLTableCaptionElement> }) {
  return <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
