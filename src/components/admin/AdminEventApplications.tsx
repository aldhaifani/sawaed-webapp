"use client";

import type { ReactElement } from "react";
import { useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import type { RegistrationStatus } from "@/../convex/eventRegistrations";
import { Button } from "@/components/ui/button";
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import BasicDropdown from "@/components/ui/BasicDropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApplicantProfileDialog } from "@/components/admin/ApplicantProfileDialog";

function formatDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleString(locale, { hour12: false });
}

type AdminRow = {
  registration: {
    _id: unknown;
    userId: unknown;
    timestamp: number;
    status: RegistrationStatus;
    notes?: string | null;
  };
  user: {
    _id: unknown;
    firstNameAr: string | null;
    lastNameAr: string | null;
    firstNameEn: string | null;
    lastNameEn: string | null;
    email: string;
  } | null;
};

export function AdminEventApplications(): ReactElement {
  const params = useParams<{ id: string; locale: string }>();
  const eventId = params?.id ?? "";
  const locale = (params?.locale as "ar" | "en") ?? "ar";
  const t = useTranslations("opportunities.adminApplications");

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "accepted" | "rejected" | "cancelled" | "waitlisted"
  >("all");
  const [searchText, setSearchText] = useState<string>("");
  const [dateFrom] = useState<string>("");
  const [dateTo] = useState<string>("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<(string | null)[]>([null]);
  const pageSize = 20;

  const event = useQuery(
    api.events.getPublicEventById,
    eventId ? { id: eventId as unknown as Id<"events">, locale } : "skip",
  );

  const paged = useQuery(
    api.eventRegistrations.listEventRegistrationsForAdminPaged,
    eventId
      ? {
          eventId: eventId as unknown as Id<"events">,
          status: statusFilter === "all" ? undefined : statusFilter,
          searchText: searchText.trim() || undefined,
          dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
          dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
          cursor: cursor ?? undefined,
          pageSize,
        }
      : "skip",
  );

  const counts = useQuery(
    api.eventRegistrations.getEventRegistrationCounts,
    eventId
      ? {
          eventId: eventId as unknown as Id<"events">,
          status: statusFilter === "all" ? undefined : statusFilter,
          searchText: searchText.trim() || undefined,
          dateFrom: dateFrom ? new Date(dateFrom).getTime() : undefined,
          dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
        }
      : "skip",
  );

  const updateStatus = useMutation(
    api.eventRegistrations.updateRegistrationStatus,
  );
  const exportCsv = useAction(
    api.eventRegistrations.exportEventRegistrationsCsv,
  );

  const rows: AdminRow[] = useMemo(() => {
    return (paged?.page ?? []) as AdminRow[];
  }, [paged?.page]);
  const title = useMemo(() => {
    if (!event) return t("title");
    const etitle = (locale === "ar" ? event.titleAr : event.titleEn) ?? "";
    return `${t("title")}: ${etitle}`;
  }, [event, t, locale]);

  const displayName = useCallback(
    (entry: AdminRow): string => {
      const u = entry.user;
      if (!u) return "-";
      const ar = [u.firstNameAr, u.lastNameAr].filter(Boolean).join(" ");
      const en = [u.firstNameEn, u.lastNameEn].filter(Boolean).join(" ");
      const name = locale === "ar" ? ar || en : en || ar;
      const fallback = u.email ?? String(u._id);
      return name || fallback;
    },
    [locale],
  );

  function onNext(): void {
    if (!paged?.continueCursor) return;
    setPrevCursors((prev) => [...prev, cursor]);
    setCursor(paged.continueCursor);
  }

  function onPrev(): void {
    if (prevCursors.length <= 1) return;
    setPrevCursors((prev) => {
      const copy = [...prev];
      const newCursor = copy[copy.length - 2] ?? null;
      copy.pop();
      setCursor(newCursor);
      return copy;
    });
  }

  function resetPaging(): void {
    setCursor(null);
    setPrevCursors([null]);
  }

  // Build columns for TanStack Table
  type Row = AdminRow & { applicant: string };
  const dataRows: readonly Row[] = useMemo(() => {
    return rows.map((r) => ({ ...r, applicant: displayName(r) }));
  }, [rows, displayName]);

  const columns: ColumnDef<Row>[] = useMemo(
    () => [
      {
        accessorKey: "applicant",
        header: t("table.applicant"),
        cell: ({ row }) => (
          <span className="truncate">{row.getValue("applicant")}</span>
        ),
      },
      {
        accessorKey: "registrationId",
        header: t("table.registrationId"),
        cell: ({ row }) => (
          <span
            className="inline-block max-w-[16ch] truncate font-mono text-xs break-all"
            title={String(row.original.registration._id)}
          >
            {String(row.original.registration._id)}
          </span>
        ),
      },
      {
        accessorKey: "timestamp",
        header: t("table.timestamp"),
        cell: ({ row }) => (
          <span>{formatDate(row.original.registration.timestamp, locale)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: t("table.status"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {t(
              `status.${row.original.registration.status}` as unknown as never,
            )}
          </Badge>
        ),
      },
      {
        accessorKey: "notes",
        header: t("table.notes"),
        cell: ({ row }) => (
          <span
            className="max-w-[20ch] truncate"
            title={row.original.registration.notes ?? "-"}
          >
            {row.original.registration.notes ?? "-"}
          </span>
        ),
      },
      {
        id: "profile",
        header: t("actions.viewProfile"),
        cell: ({ row }) => {
          const userId = row.original.registration.userId as Id<"appUsers">;
          return (
            <div className="flex ltr:justify-end rtl:justify-start">
              <ApplicantProfileDialog
                userId={userId}
                locale={locale}
                triggerLabel={t("actions.viewProfile")}
              />
            </div>
          );
        },
      },
      {
        id: "actions",
        header: t("table.actions"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2 ltr:justify-end rtl:justify-start">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await updateStatus({
                    registrationId: row.original.registration
                      ._id as Id<"eventRegistrations">,
                    status: "accepted",
                  });
                  toast.success(t("status.accepted"));
                } catch (err) {
                  toast.error(String(err));
                }
              }}
            >
              {t("actions.accept")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await updateStatus({
                    registrationId: row.original.registration
                      ._id as Id<"eventRegistrations">,
                    status: "waitlisted",
                  });
                  toast.success(t("status.waitlisted"));
                } catch (err) {
                  toast.error(String(err));
                }
              }}
            >
              {t("actions.waitlist")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await updateStatus({
                    registrationId: row.original.registration
                      ._id as Id<"eventRegistrations">,
                    status: "rejected",
                  });
                  toast.success(t("status.rejected"));
                } catch (err) {
                  toast.error(String(err));
                }
              }}
            >
              {t("actions.reject")}
            </Button>
          </div>
        ),
      },
    ],
    [t, locale, updateStatus],
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data: dataRows as Row[],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
  });

  return (
    <main
      className="bg-background min-h-screen w-full p-4 sm:p-6"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{title}</span>
            <Button
              onClick={async () => {
                try {
                  const res = await exportCsv({
                    eventId: eventId as unknown as Id<"events">,
                    status: statusFilter === "all" ? undefined : statusFilter,
                    searchText: searchText.trim() || undefined,
                    dateFrom: dateFrom
                      ? new Date(dateFrom).getTime()
                      : undefined,
                    dateTo: dateTo ? new Date(dateTo).getTime() : undefined,
                  });
                  const url = res?.url as string | undefined;
                  if (url) {
                    // Fetch and trigger a direct download with a filename
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    const date = new Date().toISOString().slice(0, 10);
                    const fname = `event-registrations-${eventId}-${date}.csv`;
                    a.href = objectUrl;
                    a.download = fname;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(objectUrl);
                  } else {
                    toast.error("Export failed");
                  }
                } catch (err) {
                  toast.error(String(err));
                }
              }}
            >
              {t("export.button")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 py-2">
            <Input
              placeholder={t("filter.searchPlaceholder")}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                resetPaging();
              }}
              className="max-w-sm"
            />
            <div className="flex items-center gap-2">
              <div dir={locale === "ar" ? "rtl" : "ltr"}>
                <BasicDropdown
                  label={t("filter.status")}
                  items={[
                    { id: "all", label: t("filter.all") },
                    { id: "pending", label: t("status.pending") },
                    { id: "accepted", label: t("status.accepted") },
                    { id: "waitlisted", label: t("status.waitlisted") },
                    { id: "rejected", label: t("status.rejected") },
                    { id: "cancelled", label: t("status.cancelled") },
                  ]}
                  selectedId={statusFilter}
                  onChange={(item) =>
                    setStatusFilter(
                      item.id as
                        | "all"
                        | "pending"
                        | "accepted"
                        | "rejected"
                        | "cancelled"
                        | "waitlisted",
                    )
                  }
                  className="w-40 text-sm"
                />
              </div>
            </div>
          </div>
          {counts ? (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
              <div className="rounded-md border p-2 text-center text-sm">
                <div className="text-muted-foreground">{t("counts.total")}</div>
                <div className="font-semibold">{counts.total}</div>
              </div>
              <div className="rounded-md border p-2 text-center text-sm">
                <div className="text-muted-foreground">
                  {t("counts.pending")}
                </div>
                <div className="font-semibold">{counts.pending}</div>
              </div>
              <div className="rounded-md border p-2 text-center text-sm">
                <div className="text-muted-foreground">
                  {t("counts.accepted")}
                </div>
                <div className="font-semibold">{counts.accepted}</div>
              </div>
              <div className="rounded-md border p-2 text-center text-sm">
                <div className="text-muted-foreground">
                  {t("counts.rejected")}
                </div>
                <div className="font-semibold">{counts.rejected}</div>
              </div>
              <div className="rounded-md border p-2 text-center text-sm">
                <div className="text-muted-foreground">
                  {t("counts.cancelled")}
                </div>
                <div className="font-semibold">{counts.cancelled}</div>
              </div>
              <div className="rounded-md border p-2 text-center text-sm">
                <div className="text-muted-foreground">
                  {t("counts.waitlisted")}
                </div>
                <div className="font-semibold">{counts.waitlisted}</div>
              </div>
              <div className="col-span-2 rounded-md border p-2 text-center text-sm sm:col-span-6">
                <div className="text-muted-foreground">
                  {t("counts.acceptedSeats")}
                </div>
                <div className="font-semibold">{counts.acceptedSeats}</div>
              </div>
            </div>
          ) : null}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder
                          ? null
                          : flexRender(
                              h.column.columnDef.header,
                              h.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={prevCursors.length <= 1}
              onClick={onPrev}
            >
              {t("pagination.prev")}
            </Button>
            <div className="text-muted-foreground text-xs">
              {rows.length} / {pageSize}
            </div>
            <Button
              variant="outline"
              disabled={!paged || paged.isDone}
              onClick={onNext}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
