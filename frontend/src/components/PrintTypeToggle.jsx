import { memo } from "react"

function PrintTypeToggle({ value, onChange, disabled = false, options = [] }) {
  const activeOptions = [...new Set(options.filter(Boolean))]
  const availableOptions = activeOptions.length > 0 ? activeOptions : ["Standard"]

  return (
    <div
      className="grid gap-1 rounded-lg bg-black p-1"
      style={{ gridTemplateColumns: `repeat(${Math.min(availableOptions.length, 4)}, minmax(0, 1fr))` }}
    >
      {availableOptions.map((option) => {
        const isActive = option === value
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            disabled={disabled || availableOptions.length === 1}
            aria-pressed={isActive}
            className={`min-w-0 rounded-md px-2 py-1.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive ? "bg-yellow-400 text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            title={option}
          >
            <span className="block truncate">{option}</span>
          </button>
        )
      })}
    </div>
  )
}

export default memo(PrintTypeToggle)