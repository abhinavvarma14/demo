export const getApiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.code === "AUTH_REQUIRED"
    ? "Please login to continue"
    : !error?.response && error?.request
      ? "Network issue. Please check your connection and try again."
      : error?.response?.status >= 500
        ? "Server error. Please try again shortly."
        : error?.response?.data?.detail || fallback
