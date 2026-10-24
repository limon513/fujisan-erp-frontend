"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import ResourceSelect from "@/components/common/resource-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDT, formatBDTShort, formatNumber, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import { customers } from "@/modules/customer/api";
import CustomerFormSheet from "@/modules/customer/components/customer-form-sheet";
import { plots } from "@/modules/plot/api";
import { projects } from "@/modules/project/api";
import { bookings, paymentPlans, useBookingQuote } from "../api";
import { planTerms } from "../constants";
import ScheduleView from "./schedule-view";

const BOOKABLE = ["AVAILABLE", "HOLD"];

function Step({ number, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs">
            {number}
          </span>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function PlanChoice({ plan, selected, onSelect }) {
  const terms = planTerms(plan);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(plan.id)}
      className={cn(
        "w-full rounded-lg border p-3 text-left text-sm transition-colors",
        selected ? "border-primary ring-primary/30 bg-primary/5 ring-2" : "hover:bg-muted/50",
      )}
    >
      <p className="font-medium">{plan.name}</p>
      <p className="text-muted-foreground text-xs">
        {terms.payment} · {terms.interest}
      </p>
    </button>
  );
}

export default function BookingFormScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const can = useCan();
  const create = bookings.useCreate();

  const [customerId, setCustomerId] = useState(params.get("customerId") ?? "");
  const [projectId, setProjectId] = useState(params.get("projectId") ?? "");
  const [plotId, setPlotId] = useState(params.get("plotId") ?? "");
  const [paymentPlanId, setPaymentPlanId] = useState("");
  const [discountType, setDiscountType] = useState("FIXED");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [bookingDate, setBookingDate] = useState(() => toDateInput(new Date().toISOString()));
  const [notes, setNotes] = useState("");
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const leadId = params.get("leadId") ?? undefined;

  // Coming from a plot: find its project
  const { data: startPlot } = plots.useItem(
    params.get("plotId") && !params.get("projectId") ? params.get("plotId") : null,
  );
  // The chosen project, else the project of the plot we started from
  const project = projectId || startPlot?.project?.id || "";

  const { data: plotList, isLoading: plotsLoading } = plots.useList(
    { projectId: project, limit: 100, sortBy: "code", sortOrder: "asc" },
    { enabled: Boolean(project) },
  );
  const bookable = (plotList?.data ?? []).filter((p) => BOOKABLE.includes(p.status));
  const { data: planList } = paymentPlans.useList(
    { projectId: project, isActive: true, limit: 100, sortBy: "sortOrder", sortOrder: "asc" },
    { enabled: Boolean(project) },
  );
  const plans = planList?.data ?? [];

  const discount = Number(discountValue) || 0;
  // Debounce a string: a fresh object each render would restart the timer for ever
  const quoteKey = useDebouncedValue(
    JSON.stringify({
      customerId,
      plotId,
      paymentPlanId,
      bookingDate: bookingDate || undefined,
      discountType,
      discountValue: discount,
    }),
    300,
  );
  const quote = useBookingQuote(JSON.parse(quoteKey));

  const submit = async (event) => {
    event.preventDefault();
    const missing = {
      ...(!customerId && { customerId: "Choose the customer" }),
      ...(!plotId && { plotId: "Choose the plot" }),
      ...(!paymentPlanId && { paymentPlanId: "Choose a payment plan" }),
      ...(discount > 0 &&
        discountReason.trim().length < 3 && { discountReason: "Say why the discount is needed" }),
    };
    setErrors(missing);
    setError(null);
    if (Object.keys(missing).length) return;
    try {
      const booking = await create.mutateAsync({
        customerId,
        plotId,
        paymentPlanId,
        bookingDate: bookingDate || undefined,
        discountType,
        discountValue: discount,
        ...(discount > 0 && { discountReason }),
        ...(leadId && { leadId }),
        ...(notes.trim() && { notes }),
      });
      toast.success(`${booking.bookingNo} sent for approval`);
      router.push(`/bookings/${booking.id}`);
    } catch (apiError) {
      const byField = Object.fromEntries((apiError.errors ?? []).map((e) => [e.path, e.message]));
      setErrors(byField);
      if (!Object.keys(byField).length) setError(apiError.message);
    }
  };

  return (
    <RequirePermission permission="booking.create">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/bookings">
          <ArrowLeft /> All bookings
        </Link>
      </Button>
      <PageHeader
        title="New booking"
        description="The plot is reserved as soon as you submit. The Sales Manager approves the booking and its discount."
      />
      <form
        onSubmit={submit}
        noValidate
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]"
      >
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Step number={1} title="Customer">
            <Field data-invalid={Boolean(errors.customerId)}>
              <FieldLabel htmlFor="customerId">Who is buying?</FieldLabel>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <ResourceSelect
                    id="customerId"
                    resource={customers}
                    params={{ sortBy: "fullName", sortOrder: "asc" }}
                    value={customerId}
                    onChange={setCustomerId}
                    invalid={Boolean(errors.customerId)}
                    getLabel={(c) => `${c.fullName} (${c.customerCode})`}
                  />
                </div>
                {can("customer.create") && (
                  <Button type="button" variant="outline" onClick={() => setAddingCustomer(true)}>
                    <Plus /> New
                  </Button>
                )}
              </div>
              <FieldError>{errors.customerId}</FieldError>
            </Field>
          </Step>

          <Step
            number={2}
            title="Plot"
            description="Available plots, and plots on hold for this customer."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="projectId">Project</FieldLabel>
                <ResourceSelect
                  id="projectId"
                  resource={projects}
                  value={project}
                  onChange={(value) => {
                    setProjectId(value);
                    setPlotId("");
                    setPaymentPlanId("");
                  }}
                />
              </Field>
              <Field data-invalid={Boolean(errors.plotId)}>
                <FieldLabel htmlFor="plotId">Plot</FieldLabel>
                <Select
                  value={plotId}
                  onValueChange={setPlotId}
                  disabled={!project || plotsLoading}
                >
                  <SelectTrigger
                    id="plotId"
                    className="w-full"
                    aria-invalid={Boolean(errors.plotId)}
                  >
                    <SelectValue
                      placeholder={
                        project
                          ? bookable.length
                            ? "Select…"
                            : "No plot available"
                          : "Choose a project first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bookable.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} · {formatNumber(p.areaSqft)} sqft · {formatBDTShort(p.price)}
                        {p.status === "HOLD" && " · on hold"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError>{errors.plotId}</FieldError>
              </Field>
            </div>
          </Step>

          <Step number={3} title="Payment plan">
            <Field data-invalid={Boolean(errors.paymentPlanId)}>
              {!project ? (
                <p className="text-muted-foreground text-sm">Choose a project to see its plans.</p>
              ) : plans.length ? (
                <div
                  role="radiogroup"
                  aria-label="Payment plan"
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {plans.map((plan) => (
                    <PlanChoice
                      key={plan.id}
                      plan={plan}
                      selected={plan.id === paymentPlanId}
                      onSelect={setPaymentPlanId}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No payment plan is offered for this project yet.
                </p>
              )}
              <FieldError>{errors.paymentPlanId}</FieldError>
            </Field>
          </Step>

          <Step
            number={4}
            title="Discount and date"
            description="Leave the discount empty if none is asked."
          >
            <div className="grid grid-cols-[auto_1fr] items-start gap-2">
              <Field>
                <FieldLabel>Discount</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={discountType}
                  onValueChange={(v) => v && setDiscountType(v)}
                  aria-label="Discount: amount or percentage"
                >
                  <ToggleGroupItem value="FIXED">৳</ToggleGroupItem>
                  <ToggleGroupItem value="PERCENT">%</ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field data-invalid={Boolean(errors.discountValue)}>
                <FieldLabel htmlFor="discountValue">
                  {discountType === "PERCENT" ? "% of the price" : "Amount (৳)"}
                </FieldLabel>
                <Input
                  id="discountValue"
                  inputMode="decimal"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.]/g, ""))}
                  aria-invalid={Boolean(errors.discountValue)}
                />
                <FieldError>{errors.discountValue}</FieldError>
              </Field>
            </div>
            {discount > 0 && (
              <Field data-invalid={Boolean(errors.discountReason)}>
                <FieldLabel htmlFor="discountReason">Why?</FieldLabel>
                <Input
                  id="discountReason"
                  placeholder="Pays the down payment today, long-time customer, …"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  aria-invalid={Boolean(errors.discountReason)}
                />
                <FieldError>{errors.discountReason}</FieldError>
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="bookingDate">Booking date</FieldLabel>
                <Input
                  id="bookingDate"
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </Step>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Discount as asked; the Sales Manager may change it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!quote.data && !quote.error ? (
                quote.isFetching ? (
                  <Skeleton className="h-64" />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Choose the customer, plot and plan to see the price.
                  </p>
                )
              ) : quote.error ? (
                <p className="text-destructive text-sm">{quote.error.message}</p>
              ) : (
                <>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">List price</dt>
                      <dd className="tabular-nums">{formatBDT(quote.data.listPrice)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Discount asked</dt>
                      <dd className="tabular-nums">
                        {Number(quote.data.discountAmount) > 0
                          ? `−${formatBDT(quote.data.discountAmount)} (${Number(quote.data.discountPercent)}%)`
                          : "None"}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-medium">
                      <dt>Price after discount</dt>
                      <dd className="tabular-nums">{formatBDT(quote.data.netPrice)}</dd>
                    </div>
                  </dl>
                  <ScheduleView schedule={quote.data.schedule} />
                </>
              )}
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? <Spinner /> : <Send />} Submit for approval
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
      <CustomerFormSheet
        open={addingCustomer}
        onOpenChange={setAddingCustomer}
        customer={null}
        onSaved={(customer) => setCustomerId(customer.id)}
      />
    </RequirePermission>
  );
}
