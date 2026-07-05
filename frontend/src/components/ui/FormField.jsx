export default function FormField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
export const selectClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
