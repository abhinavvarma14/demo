import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import API, { API_BASE_URL } from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

const tabs = [
  ["verification", "Verification"],
  ["printing", "Printing Queue"],
  ["completed", "Completed"],
  ["banners", "Banners"],
]

const formatAmount = (value) => `₹${Math.round(Number(value || 0))}`
const submittedAt = (value) => (value ? new Date(value).toLocaleString() : "-")

const normalizeLink = (value) => {
  const trimmed = String(value || "").trim()
  if (!trimmed) return ""
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`
}

const orderAmount = (order) => order.amount ?? order.total_amount ?? 0
const orderName = (order) => order.user_name || order.user?.username || "-"
const orderPhone = (order) => order.phone_number || order.contact_number || "-"
const orderHostel = (order) => order.hostel || order.hostel_name || "-"

function Admin({ defaultSection = "verification" }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [banners, setBanners] = useState([])
  const [analytics, setAnalytics] = useState({
    total_orders: 0,
    pending_orders: 0,
    printing_orders: 0,
    completed_orders: 0,
    total_revenue: 0,
  })
  const [activeSection, setActiveSection] = useState(defaultSection === "orders" ? "verification" : defaultSection)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")
  const [editingBannerId, setEditingBannerId] = useState("")
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    link: "",
    clickable: false,
    active: true,
    image: null,
  })

  useEffect(() => {
    setActiveSection(defaultSection === "orders" ? "verification" : defaultSection)
  }, [defaultSection])

  const fetchOrders = async () => {
    const res = await API.get("/admin/orders")
    setOrders(res.data || [])
  }

  const fetchBanners = async () => {
    const res = await API.get("/admin/banners")
    setBanners(res.data || [])
  }

  const fetchAnalytics = async () => {
    const res = await API.get("/admin/dashboard")
    setAnalytics(res.data)
  }

  const refreshAdminData = async () => {
    try {
      await Promise.all([fetchOrders(), fetchBanners(), fetchAnalytics()])
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to load admin data"))
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await refreshAdminData()
      setLoading(false)
    }
    load()
    // Initial admin load only; actions call refreshAdminData explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingSubmissions = useMemo(
    () => orders.filter((order) => order.payment_status === "pending_verification" && (order.utr_number || order.transaction_id)),
    [orders]
  )

  const printingOrders = useMemo(
    () => orders.filter((order) => ["approved", "printing"].includes(order.payment_status)),
    [orders]
  )

  const completedOrders = useMemo(
    () => orders.filter((order) => order.payment_status === "delivered"),
    [orders]
  )

  const filteredPending = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pendingSubmissions
    return pendingSubmissions.filter((order) =>
      [
        order.utr_number,
        order.utr,
        order.transaction_id,
        orderPhone(order),
        orderName(order),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [pendingSubmissions, search])

  const goToSection = (section) => {
    setActiveSection(section)
    if (section === "printing") {
      navigate("/admin/print-queue")
      return
    }
    if (section === "banners") {
      navigate("/admin/banners")
      return
    }
    navigate("/admin")
  }

  const updateStatus = async (orderId, status) => {
    try {
      setActionLoading(`${orderId}-${status}`)
      await API.put(`/admin/orders/${orderId}/status?status=${status}`)
      toast.success("Order updated")
      await refreshAdminData()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to update order"))
    } finally {
      setActionLoading("")
    }
  }

  const downloadExcel = async (path, filename) => {
    try {
      setActionLoading(filename)
      const res = await API.get(path, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to export Excel"))
    } finally {
      setActionLoading("")
    }
  }

  const deleteUploadedFile = async (itemId) => {
    try {
      setActionLoading(`delete-file-${itemId}`)
      await API.delete(`/admin/order-items/${itemId}/file`)
      toast.success("Uploaded file deleted")
      await fetchOrders()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to delete uploaded file"))
    } finally {
      setActionLoading("")
    }
  }

  const resetBannerForm = () => {
    setEditingBannerId("")
    setBannerForm({
      title: "",
      subtitle: "",
      link: "",
      clickable: false,
      active: true,
      image: null,
    })
  }

  const submitBanner = async () => {
    if (!editingBannerId && !bannerForm.image) {
      toast.error("Please select a banner image")
      return
    }

    try {
      setActionLoading(editingBannerId ? `banner-save-${editingBannerId}` : "banner-create")
      const formData = new FormData()
      if (bannerForm.image) formData.append("image", bannerForm.image)
      formData.append("title", bannerForm.title)
      formData.append("subtitle", bannerForm.subtitle)
      formData.append("link", normalizeLink(bannerForm.link))
      formData.append("clickable", String(bannerForm.clickable))
      formData.append("active", String(bannerForm.active))

      if (editingBannerId) {
        await API.put(`/api/banners/${editingBannerId}`, formData)
        toast.success("Banner updated")
      } else {
        await API.post("/api/banners", formData)
        toast.success("Banner created")
      }

      resetBannerForm()
      await fetchBanners()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to save banner"))
    } finally {
      setActionLoading("")
    }
  }

  const editBanner = (banner) => {
    setEditingBannerId(banner.id)
    setBannerForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      link: banner.link || "",
      clickable: !!banner.clickable,
      active: !!banner.active,
      image: null,
    })
  }

  const toggleBannerActive = async (banner) => {
    try {
      setActionLoading(`banner-toggle-${banner.id}`)
      const formData = new FormData()
      formData.append("title", banner.title || "")
      formData.append("subtitle", banner.subtitle || "")
      formData.append("link", normalizeLink(banner.link))
      formData.append("clickable", String(!!banner.clickable))
      formData.append("active", String(!banner.active))
      await API.put(`/api/banners/${banner.id}`, formData)
      await fetchBanners()
      toast.success("Banner status updated")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to update banner"))
    } finally {
      setActionLoading("")
    }
  }

  const deleteBanner = async (bannerId) => {
    try {
      setActionLoading(`banner-delete-${bannerId}`)
      await API.delete(`/api/banners/${bannerId}`)
      await fetchBanners()
      if (editingBannerId === bannerId) resetBannerForm()
      toast.success("Banner deleted")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to delete banner"))
    } finally {
      setActionLoading("")
    }
  }

  const OrderItems = ({ order }) => (
    <div className="mt-3 grid gap-2">
      {(order.items || []).map((item) => (
        <div key={item.id} className="rounded-lg border border-white/5 bg-black/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{item.item_name || "Unnamed item"}</p>
              <p className="mt-1 text-xs text-white/45">
                {item.mode || "-"} | {item.print_type === "single" ? "Single Side" : item.print_type === "double" ? "Double Side" : item.print_type || "-"} | Qty {item.quantity}
              </p>
            </div>
            <span className="text-sm font-semibold text-yellow-300">{formatAmount(item.total_price)}</span>
          </div>
          {item.stored_filename && (
            <div className="mt-2 flex gap-3">
              <a
                href={`${API_BASE_URL}/uploads/${item.stored_filename}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-300 underline"
              >
                Download PDF
              </a>
              <button
                onClick={() => deleteUploadedFile(item.id)}
                disabled={actionLoading === `delete-file-${item.id}`}
                className="text-sm text-red-300"
              >
                {actionLoading === `delete-file-${item.id}` ? "Deleting..." : "Delete File"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const VerificationCard = ({ order }) => (
    <article className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{orderName(order)}</h3>
            <span className="rounded-xl border border-yellow-400/25 bg-yellow-400/15 px-4 py-2 text-2xl font-black text-yellow-300">
              {formatAmount(orderAmount(order))}
            </span>
          </div>
          <div className="mt-3 grid gap-1 text-sm text-white/60 sm:grid-cols-2">
            <p>Phone: {orderPhone(order)}</p>
            <p>UTR: <span className="font-semibold text-white">{order.utr_number || order.utr || "-"}</span></p>
            <p>Transaction ID: <span className="font-semibold text-white">{order.transaction_id || "-"}</span></p>
            <p>Submitted: {submittedAt(order.created_at)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateStatus(order.id, "approved")}
            disabled={actionLoading === `${order.id}-approved`}
            className="rounded-xl bg-green-400 px-4 py-2 font-semibold text-black"
          >
            {actionLoading === `${order.id}-approved` ? "Saving..." : "Approve"}
          </button>
          <button
            onClick={() => updateStatus(order.id, "rejected")}
            disabled={actionLoading === `${order.id}-rejected`}
            className="rounded-xl bg-red-400 px-4 py-2 font-semibold text-black"
          >
            {actionLoading === `${order.id}-rejected` ? "Saving..." : "Reject"}
          </button>
        </div>
      </div>
    </article>
  )

  const PrintingCard = ({ order }) => (
    <article className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{orderName(order)}</h3>
            <span className="rounded-lg bg-yellow-400 px-3 py-1 text-lg font-black text-black">{formatAmount(orderAmount(order))}</span>
          </div>
          <div className="mt-2 grid gap-1 text-sm text-white/60 sm:grid-cols-2">
            <p>Phone: {orderPhone(order)}</p>
            <p>Hostel: {orderHostel(order)}</p>
            <p>Delivery: {order.delivery_type}</p>
            <p>Status: {order.payment_status}</p>
          </div>
          <OrderItems order={order} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => updateStatus(order.id, "printing")}
            disabled={actionLoading === `${order.id}-printing` || order.payment_status === "printing"}
            className="rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-black disabled:opacity-60"
          >
            {actionLoading === `${order.id}-printing` ? "Saving..." : "Mark Printing"}
          </button>
          <button
            onClick={() => updateStatus(order.id, "delivered")}
            disabled={actionLoading === `${order.id}-delivered`}
            className="rounded-xl bg-blue-400 px-4 py-2 font-semibold text-black"
          >
            {actionLoading === `${order.id}-delivered` ? "Saving..." : "Mark Delivered"}
          </button>
        </div>
      </div>
    </article>
  )

  return (
    <div className="px-4 pb-24 pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/45">BatPrint Admin</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Manual Verification</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Pending" value={pendingSubmissions.length} />
            <Metric label="Printing" value={printingOrders.length} />
            <Metric label="Delivered" value={completedOrders.length} />
            <Metric label="Revenue" value={formatAmount(analytics.total_revenue)} />
          </div>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-2">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => goToSection(key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeSection === key ? "bg-yellow-400 text-black" : "text-white/70 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="h-48 rounded-xl border border-white/10 bg-white/5 animate-pulse" />}

        {!loading && activeSection === "verification" && (
          <section className="grid gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 lg:flex-row lg:items-center lg:justify-between">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search UTR, transaction ID, phone number, or user name"
                className="min-h-12 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-yellow-400/70"
              />
              <button
                onClick={() => downloadExcel("/admin/payment-verification-excel", "payment-verification.xlsx")}
                disabled={actionLoading === "payment-verification.xlsx"}
                className="rounded-xl bg-yellow-400 px-4 py-3 font-semibold text-black"
              >
                Download Excel
              </button>
            </div>

            {filteredPending.length === 0 ? (
              <EmptyState text="No pending payment submissions" />
            ) : (
              filteredPending.map((order) => <VerificationCard key={order.id} order={order} />)
            )}
          </section>
        )}

        {!loading && activeSection === "printing" && (
          <section className="grid gap-4">
            <div className="flex justify-end">
              <button
                onClick={() => downloadExcel("/admin/printing-excel", "printing-queue.xlsx")}
                disabled={actionLoading === "printing-queue.xlsx"}
                className="rounded-xl bg-yellow-400 px-4 py-3 font-semibold text-black"
              >
                Download Excel
              </button>
            </div>
            {printingOrders.length === 0 ? (
              <EmptyState text="No approved orders in printing queue" />
            ) : (
              printingOrders.map((order) => <PrintingCard key={order.id} order={order} />)
            )}
          </section>
        )}

        {!loading && activeSection === "completed" && (
          <section className="grid gap-4">
            {completedOrders.length === 0 ? (
              <EmptyState text="No delivered orders yet" />
            ) : (
              completedOrders.map((order) => <PrintingCard key={order.id} order={order} />)
            )}
          </section>
        )}

        {!loading && activeSection === "banners" && (
          <section className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Banner Management</h2>
                {editingBannerId && (
                  <button onClick={resetBannerForm} className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white">
                    Cancel
                  </button>
                )}
              </div>
              <div className="grid gap-3">
                <input type="file" accept="image/*" onChange={(event) => setBannerForm((current) => ({ ...current, image: event.target.files?.[0] || null }))} className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
                <input value={bannerForm.title} onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
                <input value={bannerForm.subtitle} onChange={(event) => setBannerForm((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Subtitle" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
                <input value={bannerForm.link} onChange={(event) => setBannerForm((current) => ({ ...current, link: event.target.value }))} placeholder="Link, e.g. www.telegram.com" className="rounded-xl border border-white/10 bg-black/30 p-3 text-white" />
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white">
                  <input type="checkbox" checked={bannerForm.clickable} onChange={(event) => setBannerForm((current) => ({ ...current, clickable: event.target.checked }))} />
                  Clickable
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white">
                  <input type="checkbox" checked={bannerForm.active} onChange={(event) => setBannerForm((current) => ({ ...current, active: event.target.checked }))} />
                  Active
                </label>
                <button onClick={submitBanner} disabled={actionLoading === "banner-create" || actionLoading === `banner-save-${editingBannerId}`} className="rounded-xl bg-yellow-400 py-3 font-semibold text-black">
                  {editingBannerId ? "Update Banner" : "Add Banner"}
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {banners.length === 0 && <EmptyState text="No banners yet" />}
              {banners.map((banner) => (
                <article key={banner.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex gap-4">
                    <img
                      src={/^https?:\/\//i.test(banner.image) ? banner.image : `${API_BASE_URL}${banner.image}`}
                      alt={banner.title || "Banner"}
                      className="h-20 w-28 rounded-lg border border-white/10 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{banner.title || "Untitled banner"}</p>
                      <p className="truncate text-sm text-white/50">{banner.subtitle || "No subtitle"}</p>
                      {banner.link ? (
                        <a href={normalizeLink(banner.link)} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-yellow-300 underline">
                          {normalizeLink(banner.link)}
                        </a>
                      ) : (
                        <p className="text-xs text-white/35">No link</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => toggleBannerActive(banner)} disabled={actionLoading === `banner-toggle-${banner.id}`} className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                      {banner.active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => editBanner(banner)} className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-semibold text-black">
                      Edit
                    </button>
                    <button onClick={() => deleteBanner(banner.id)} disabled={actionLoading === `banner-delete-${banner.id}`} className="rounded-lg bg-red-400 px-3 py-2 text-sm font-semibold text-black">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs text-white/45">{label}</p>
      <p className="text-lg font-bold text-yellow-300">{value}</p>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
      {text}
    </div>
  )
}

export default Admin
