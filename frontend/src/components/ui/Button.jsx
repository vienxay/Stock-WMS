const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 focus-visible:ring-blue-500',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 focus-visible:ring-gray-400',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 focus-visible:ring-red-500',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 focus-visible:ring-emerald-500',
}

export default function Button({ variant = 'primary', className = '', disabled, children, ...props }) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all
        active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
