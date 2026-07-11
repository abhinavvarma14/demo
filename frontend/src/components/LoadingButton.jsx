import { forwardRef } from "react"
import { Loader2 } from "lucide-react"

const LoadingButton = forwardRef(function LoadingButton(
  {
    children,
    loading = false,
    success = false,
    error = false,
    disabled = false,
    loadingText,
    successText,
    errorText,
    className = "",
    type = "button",
    onClick,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading || success
  const label = loading ? (loadingText || children) : success ? (successText || children) : error ? (errorText || children) : children

  const handleClick = (event) => {
    if (isDisabled) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      ref={ref}
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
      data-success={success ? "true" : undefined}
      data-error={error ? "true" : undefined}
      className={`inline-flex items-center justify-center gap-2 transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      <span>{label}</span>
    </button>
  )
})

export default LoadingButton
