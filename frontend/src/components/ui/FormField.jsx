export default function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export const inputClass = "w-full border rounded-md px-3 py-2 text-sm";
export const selectClass =
  "w-full border rounded-md px-3 py-2 text-sm bg-white";
