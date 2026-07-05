const COLORS = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  TRANSFERRED: "bg-emerald-100 text-emerald-800",
  ISSUED: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

export default function StatusBadge({ status }) {
  const cls = COLORS[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
