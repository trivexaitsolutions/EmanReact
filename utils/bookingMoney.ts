// Historic booking totals come from the saved booking amount, not live pool rates.
export const formatBookingRupees = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "Not Available";
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return "Not Available";
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
};
