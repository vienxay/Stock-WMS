const VARIANTS = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  success: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

export default function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
