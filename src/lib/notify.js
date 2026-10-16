import { toast } from "sonner";

/** Toast an API error (ApiError message or a fallback). */
export const toastError = (error, fallback = "Something went wrong") =>
  toast.error(error?.message ?? fallback);
