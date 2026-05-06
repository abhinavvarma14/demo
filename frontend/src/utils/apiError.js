export const getApiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.code === "AUTH_REQUIRED"
    ? "Please login to continue"
    : !error?.response && error?.request
      ? "Server connection blocked. Please try again after the backend CORS update is deployed."
      : error?.response?.status >= 500
        ? "Server error. Please try again shortly."
        : error?.response?.data?.detail || fallback
