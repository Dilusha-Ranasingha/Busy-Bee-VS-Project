export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <svg
        className="size-4 animate-spin text-indigo-600"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span>{text}</span>
    </div>
  );
}
