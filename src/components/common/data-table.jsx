"use client";

import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

/**
 * Server-paginated table. The API does sorting/filtering/paging; this renders a page.
 *
 * @param columns    TanStack column defs ({ accessorKey | id, header, cell, meta: { className } })
 * @param data       rows of the current page
 * @param meta       pagination meta from the API: { page, limit, total, totalPages }
 * @param onPageChange(page)
 * @param onRowClick(row)  optional; makes rows clickable
 */
export default function DataTable({
  columns,
  data = [],
  meta,
  isLoading,
  isFetching,
  onPageChange,
  onRowClick,
  emptyMessage = "Nothing found.",
}) {
  // eslint-disable-next-line react-hooks/incompatible-library -- React Compiler isn't enabled
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta?.totalPages ?? -1,
  });

  const page = meta?.page ?? 1;
  const from = meta?.total ? (page - 1) * meta.limit + 1 : 0;
  const to = meta ? Math.min(page * meta.limit, meta.total) : 0;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "overflow-hidden rounded-lg border transition-opacity",
          isFetching && !isLoading && "opacity-60",
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }, (_, index) => (
                <TableRow key={index}>
                  {columns.map((column, columnIndex) => (
                    <TableCell key={columnIndex} className={column.meta?.className}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            {formatNumber(from)}–{formatNumber(to)} of {formatNumber(meta.total)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page <= 1 || isFetching}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-muted-foreground px-2 tabular-nums">
              {page} / {Math.max(meta.totalPages, 1)}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page >= meta.totalPages || isFetching}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
