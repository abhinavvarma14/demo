import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ShieldCheck, Search, Download, Printer, Truck, CheckCircle2, 
  XCircle, Clock, Package, MessageSquare, Image, MoreVertical,
  ChevronRight, ArrowRight, User, Phone, MapPin, Hash, Trash2,
  FileText, ExternalLink, Filter, RefreshCw
} from "lucide-react"
import API, { API_BASE_URL } from "../api/api"
import toast from "react-hot-toast"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

const ADMIN_TABS = [
  { id: "verification", label: "Verification", icon: ShieldCheck },
  { id: "approved", label: "Approved Queue", icon: Clock },
  { id: "batches", label: "Print Batches", icon: Printer },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "history", label: "History", icon: Package },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "banners", label: "Banners", icon: Image },
]

const TAB_ALIASES = {
  "": "verification",
  orders: "verification",
  printing: "approved",
  "print-queue": "batches",
  batch: "batches",
}

const normalizeTab = (value, fallback = "verification") => {
  const raw = String(value || fallback).replace(/^\/+|\/+$/g, "")
  const normalized = TAB_ALIASES[raw] || raw
  return ADMIN_TABS.some((tab) => tab.id === normalized) ? normalized : fallback
}

const formatAmount = (value) => `₹${Math.round(Number(value || 0))}`
const formatDate = (value) => (value ? new Date(value).toLocaleString("en-IN", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
}) : "-")

function Admin({ defaultSection = "verification" }) {
  const navigate = useNavigate()
  const { "*": sectionParam } = useParams()
  const [activeTab, setActiveTab] = useState("verification")

  useEffect(() => {
    setActiveTab(normalizeTab(sectionParam, normalizeTab(defaultSection)))
  }, [sectionParam, defaultSection])

  const handleTabChange = (id) => {
    const nextTab = normalizeTab(id)
    setActiveTab(nextTab)
    navigate(`/admin/${nextTab}`)
  }
  const [orders, setOrders] = useState([])
  const [batches, setBatches] = useState([])
  const [banners, setBanners] = useState([])
  const [supportThreads, setSupportThreads] = useState([])
  const [activeThread, setActiveThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")
  const [search, setSearch] = useState("")
  const [selectedOrders, setSelectedOrders] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [batchApiUnavailable, setBatchApiUnavailable] = useState(false)
  
  const [bannerForm, setBannerForm] = useState({
    title: "", subtitle: "", link: "", clickable: false, active: true, image: null
  })
  const [editingBannerId, setEditingBannerId] = useState(null)

  const messagesEndRef = useRef(null)
  const selectAllApprovedRef = useRef(null)


  const fetchData = useCallback(async () => {
    if (!isLoggedIn()) {
      navigate("/login")
      return
    }
    
    try {
      setLoading(true)
      const results = await Promise.allSettled([
        API.get("/admin/orders"),
        API.get("/admin/batches"),
        API.get("/admin/banners"),
        API.get("/admin/support-threads")
      ])
      
      if (results[0].status === "fulfilled") setOrders(results[0].value.data || [])
      const batchUnavailable = [404, 405].includes(results[1].reason?.response?.status)
      if (results[1].status === "fulfilled") {
        setBatches(results[1].value.data || [])
        setBatchApiUnavailable(false)
      } else if (batchUnavailable) {
        setBatchApiUnavailable(true)
        setBatches([])
      }
      if (results[2].status === "fulfilled") setBanners(results[2].value.data || [])
      if (results[3].status === "fulfilled") setSupportThreads(results[3].value.data || [])
      
      const failed = results.filter(r => r.status === "rejected")
      if (failed.length > 0) {
        console.error("Some admin data failed to load", failed)
        if (batchUnavailable && failed.every((result) => [404, 405].includes(result.reason?.response?.status))) {
          return
        }
        toast.error("Partial data load: some sections may be empty")
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load admin data"))
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (activeThread) {
      const fetchMessages = async () => {
        try {
          const res = await API.get(`/admin/support-threads/${activeThread.id}/messages`)
          setMessages(res.data || [])
        } catch (err) {
          console.error(err)
        }
      }
      fetchMessages()
    }
  }, [activeThread])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Filters
  const filteredVerification = useMemo(() => {
    const term = search.toLowerCase().trim()
    return orders.filter(o => o.status === "pending_verification")
      .filter(o => !term || 
        (o.utr_number?.toLowerCase().includes(term) || 
         o.transaction_id?.toLowerCase().includes(term) ||
         o.user_name?.toLowerCase().includes(term) ||
         o.phone_number?.includes(term))
      )
  }, [orders, search])

  const approvedQueue = useMemo(
    () => orders.filter(o => o.status === "approved" && !o.batch_ref_id),
    [orders]
  )
  const approvedQueueIds = useMemo(() => approvedQueue.map((order) => order.id), [approvedQueue])
  const selectedApprovedCount = useMemo(
    () => approvedQueueIds.filter((id) => selectedOrders.includes(id)).length,
    [approvedQueueIds, selectedOrders]
  )
  const allApprovedSelected = approvedQueueIds.length > 0 && selectedApprovedCount === approvedQueueIds.length
  const hasPartialApprovedSelection = selectedApprovedCount > 0 && selectedApprovedCount < approvedQueueIds.length

  useEffect(() => {
    if (selectAllApprovedRef.current) {
      selectAllApprovedRef.current.indeterminate = hasPartialApprovedSelection
    }
  }, [hasPartialApprovedSelection])

  useEffect(() => {
    setSelectedOrders((current) => current.filter((id) => approvedQueueIds.includes(id)))
  }, [approvedQueueIds])

  const readyForDelivery = useMemo(() => orders.filter(o => o.status === "ready_for_delivery"), [orders])

  const toggleAllApprovedOrders = () => {
    setSelectedOrders(allApprovedSelected ? [] : approvedQueueIds)
  }

  const deliveredHistory = useMemo(() => {
    const term = search.toLowerCase().trim()
    return orders.filter(o => o.status === "delivered")
      .filter(o => !term || 
        (o.user_name?.toLowerCase().includes(term) || o.id.toString().includes(term))
      )
  }, [orders, search])

  // Actions
  const updateOrderStatus = async (id, status) => {
    try {
      setActionLoading(`order-${id}-${status}`)
      await API.put(`/admin/orders/${id}/status?status=${status}`)
      toast.success(`Order ${status}`)
      fetchData()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setActionLoading("")
    }
  }

  const handleCreateBatch = async () => {
    if (batchApiUnavailable) {
      toast.error("Print batch API is not available on this backend. Run the updated local backend or redeploy Railway.")
      return
    }

    if (selectedOrders.length === 0) {
      toast.error("Select at least one order")
      return
    }
    try {
      setActionLoading("create-batch")
      const response = await API.post("/admin/batches", { order_ids: selectedOrders })
      const createdBatch = response.data
      toast.success("Batch created successfully")
      setBatches((current) => {
        if (!createdBatch?.id || current.some((batch) => batch.id === createdBatch.id)) {
          return current
        }
        return [createdBatch, ...current]
      })
      setOrders((current) =>
        current.map((order) =>
          selectedOrders.includes(order.id)
            ? {
                ...order,
                status: "batched",
                payment_status: "batched",
                batch_ref_id: createdBatch?.id || order.batch_ref_id,
                batch_id: createdBatch?.batch_id || order.batch_id,
              }
            : order
        )
      )
      setSelectedOrders([])
      handleTabChange("batches")
      await fetchData()
    } catch (err) {
      if ([404, 405].includes(err.response?.status)) {
        setBatchApiUnavailable(true)
        toast.error("Print batch API is not available on this backend. Run the updated local backend or redeploy Railway.")
      } else {
        toast.error(getApiErrorMessage(err))
      }
    } finally {
      setActionLoading("")
    }
  }

  const startBatchPrinting = async (batchId) => {
    try {
      setActionLoading(`batch-print-${batchId}`)
      await API.post(`/admin/batches/${batchId}/start-printing`)
      toast.success("Printing started")
      await fetchData()
      handleTabChange("batches")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setActionLoading("")
    }
  }

  const markBatchReady = async (batchId) => {
    try {
      setActionLoading(`batch-ready-${batchId}`)
      await API.post(`/admin/batches/${batchId}/ready-for-delivery`)
      toast.success("Batch ready for delivery")
      await fetchData()
      handleTabChange("delivery")
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setActionLoading("")
    }
  }

  const getDownloadFilename = (contentDisposition, fallback) => {
    if (!contentDisposition) return fallback

    const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (encodedMatch?.[1]) {
      return decodeURIComponent(encodedMatch[1].replace(/"/g, ""))
    }

    const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
    return filenameMatch?.[1] || fallback
  }

  const downloadExcel = async (url, fallbackFilename) => {
    try {
      setActionLoading(fallbackFilename)
      const res = await API.get(url, { responseType: "blob" })
      const contentType = res.headers["content-type"] || ""
      const serverFilename = getDownloadFilename(
        res.headers["content-disposition"],
        fallbackFilename
      )

      if (contentType.includes("application/json")) {
        const errorPayload = JSON.parse(await res.data.text())
        throw new Error(errorPayload.detail || "Export failed")
      }

      const isExcel = contentType.includes("spreadsheetml.sheet")
      const isCsv = contentType.includes("text/csv")
      if (!isExcel && !isCsv) {
        throw new Error("Export returned an unexpected file type")
      }

      const safeFilename = isCsv
        ? serverFilename.replace(/\.xlsx$/i, ".csv")
        : serverFilename.replace(/\.csv$/i, ".xlsx")

      const blobUrl = window.URL.createObjectURL(res.data)
      const link = document.createElement("a")
      link.href = blobUrl
      link.setAttribute("download", safeFilename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
      toast.success("Export downloaded")
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const payload = JSON.parse(text)
          toast.error(payload.detail || "Export failed")
        } catch {
          toast.error("Export failed")
        }
      } else {
        toast.error(err.message || "Export failed")
      }
    } finally {
      setActionLoading("")
    }
  }

  const sendSupportMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeThread) return
    try {
      await API.post(`/admin/support-threads/${activeThread.id}/messages`, { message: newMessage })
      setNewMessage("")
      // Refresh messages
      const res = await API.get(`/admin/support-threads/${activeThread.id}/messages`)
      setMessages(res.data || [])
    } catch {
      toast.error("Failed to send message")
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-28 px-4 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Admin Dashboard</span>
            </div>
            <h1 className="text-3xl font-black text-white">Workflow</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={fetchData}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search orders, UTR..."
                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-yellow-400/50 w-64"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
          {ADMIN_TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse border border-white/10" />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {(activeTab === "verification") && (
                <div className="grid gap-4">
                  {filteredVerification.length === 0 ? (
                    <div className="p-20 text-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
                      <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      No pending verifications
                    </div>
                  ) : (
                    filteredVerification.map(order => (
                      <div key={order.id} className="premium-card bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition group">
                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-xs font-bold px-2 py-1 bg-white/10 rounded text-white/60">ID #{order.id}</span>
                              <span className="text-xs font-bold px-2 py-1 bg-yellow-400/10 text-yellow-400 rounded">PENDING VERIFICATION</span>
                              {order.fraud_flag && <span className="text-xs font-bold px-2 py-1 bg-red-400 text-black rounded animate-pulse">FRAUD ALERT</span>}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Customer</p>
                                <p className="font-bold text-white">{order.user_name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">UTR Number</p>
                                <p className="font-mono text-sm text-yellow-300 font-bold">{order.utr_number || "-"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Transaction ID</p>
                                <p className="font-mono text-sm text-white/70">{order.transaction_id || "-"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Amount</p>
                                <p className="text-2xl font-black text-yellow-400">{formatAmount(order.total_amount)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6">
                            <button 
                              onClick={() => updateOrderStatus(order.id, "approved")}
                              disabled={actionLoading === `order-${order.id}-approved`}
                              className="px-6 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => updateOrderStatus(order.id, "rejected")}
                              disabled={actionLoading === `order-${order.id}-rejected`}
                              className="px-6 py-3 bg-red-500 text-black font-bold rounded-xl hover:bg-red-400 transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {(activeTab === "approved" || activeTab === "printing") && (
                <div>
                  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:border-yellow-400/35">
                      <input
                        ref={selectAllApprovedRef}
                        type="checkbox"
                        checked={allApprovedSelected}
                        disabled={approvedQueue.length === 0}
                        onChange={toggleAllApprovedOrders}
                        className="h-5 w-5 accent-yellow-400"
                      />
                      <span>Select all approved</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/55">
                        {selectedApprovedCount}/{approvedQueue.length}
                      </span>
                    </label>
                    <button
                      onClick={handleCreateBatch}
                      disabled={batchApiUnavailable || selectedOrders.length === 0 || actionLoading === "create-batch"}
                      className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition disabled:opacity-30 flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Create Print Batch ({selectedOrders.length})
                    </button>
                  </div>
                  {batchApiUnavailable && (
                    <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm font-medium text-yellow-100">
                      Print batches are not available from the current backend. For local testing, start the updated FastAPI server on 127.0.0.1:8000; for live Vercel, redeploy Railway with the latest backend.
                    </div>
                  )}
                  <div className="grid gap-4">
                    {approvedQueue.length === 0 ? (
                      <div className="p-16 text-center text-white/25 border-2 border-dashed border-white/5 rounded-3xl">
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        No approved orders ready for batching
                      </div>
                    ) : approvedQueue.map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => setSelectedOrders(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id])}
                        className={`premium-card border rounded-2xl p-4 cursor-pointer transition ${
                          selectedOrders.includes(order.id) ? "bg-yellow-400/10 border-yellow-400/50" : "bg-white/5 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${
                            selectedOrders.includes(order.id) ? "bg-yellow-400 border-yellow-400" : "border-white/20"
                          }`}>
                            {selectedOrders.includes(order.id) && <CheckCircle2 className="w-4 h-4 text-black" />}
                          </div>
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                            <div>
                              <p className="font-bold text-white">{order.user_name}</p>
                              <p className="text-[10px] text-white/40">{formatDate(order.created_at)}</p>
                            </div>
                            <div className="text-white/70 text-sm">
                              {order.items?.length} Items
                            </div>
                            <div className="text-white/50 text-xs">
                              {order.delivery_type} | {order.hostel || order.hostel_name}
                            </div>
                            <div className="text-right font-black text-yellow-400">
                              {formatAmount(order.total_amount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "batches" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {batches.length === 0 ? (
                    <div className="md:col-span-2 lg:col-span-3 p-16 text-center text-white/25 border-2 border-dashed border-white/5 rounded-3xl">
                      <Printer className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      {batchApiUnavailable
                        ? "Print batch API is not available on the current backend"
                        : "No print batches yet"}
                    </div>
                  ) : batches.map(batch => (
                    <div key={batch.id} className="premium-card bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-yellow-400/30 transition relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4">
                        {batch.status === "created" && <span className="px-2 py-1 bg-blue-400/10 text-blue-400 text-[10px] font-bold rounded">CREATED</span>}
                        {batch.status === "printing" && <span className="px-2 py-1 bg-yellow-400 text-black text-[10px] font-bold rounded animate-pulse">PRINTING</span>}
                        {batch.status === "ready_for_delivery" && <span className="px-2 py-1 bg-green-400 text-black text-[10px] font-bold rounded">READY</span>}
                      </div>
                      <h3 className="text-xl font-black text-white mb-1">{batch.batch_id}</h3>
                      <p className="text-white/40 text-xs mb-6">Created {formatDate(batch.created_at)}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-white/5 rounded-xl">
                          <p className="text-[10px] text-white/30 uppercase mb-1">Orders</p>
                          <p className="text-lg font-bold text-white">{batch.total_orders}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl">
                          <p className="text-[10px] text-white/30 uppercase mb-1">Revenue</p>
                          <p className="text-lg font-bold text-yellow-400">{formatAmount(batch.total_revenue)}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => downloadExcel(`/admin/batches/${batch.id}/printing-excel`, `${batch.batch_id}-print.xlsx`)}
                          className="w-full py-2.5 bg-white/5 border border-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          Download Print Excel
                        </button>
                        <button 
                          onClick={() => downloadExcel(`/admin/batches/${batch.id}/delivery-excel`, `${batch.batch_id}-delivery.xlsx`)}
                          className="w-full py-2.5 bg-white/5 border border-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition flex items-center justify-center gap-2"
                        >
                          <Truck className="w-4 h-4" />
                          Download Delivery Excel
                        </button>
                        
                        {batch.status === "created" && (
                          <button 
                            onClick={() => startBatchPrinting(batch.id)}
                            className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl mt-2 hover:bg-yellow-300 transition"
                          >
                            Start Printing
                          </button>
                        )}
                        {batch.status === "printing" && (
                          <button 
                            onClick={() => markBatchReady(batch.id)}
                            className="w-full py-3 bg-green-500 text-black font-bold rounded-xl mt-2 hover:bg-green-400 transition"
                          >
                            Mark Ready for Delivery
                          </button>
                        )}
                        
                        <button 
                          onClick={() => setSelectedBatch(batch.id)}
                          className="w-full py-2 text-white/40 hover:text-white text-xs transition mt-2"
                        >
                          View Consolidated Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "delivery" && (
                <div className="grid gap-4">
                  {readyForDelivery.length === 0 ? (
                    <div className="p-20 text-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
                      No orders ready for delivery
                    </div>
                  ) : (
                    readyForDelivery.map(order => (
                      <div key={order.id} className="premium-card bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-xs font-bold px-2 py-1 bg-green-400/10 text-green-400 rounded">READY FOR DELIVERY</span>
                              <span className="text-xs font-bold text-white/40">{order.batch_id || "Unbatched"}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] text-white/30 uppercase mb-1">Customer</p>
                                <p className="font-bold text-white">{order.user_name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/30 uppercase mb-1">Location</p>
                                <p className="text-sm text-white/70">{order.hostel || order.hostel_name} | {order.delivery_type}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/30 uppercase mb-1">Contact</p>
                                <p className="text-sm text-white/70">{order.contact_number}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-white/30 uppercase mb-1">Items</p>
                                <div className="text-xs text-white/50 max-h-12 overflow-y-auto thin-scrollbar">
                                  {order.items?.map((it, i) => (
                                    <div key={i}>{it.item_name} x{it.quantity} | {it.item_type || "Book"} | {it.mode || "-"} / {it.print_type || "-"}</div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <button 
                              onClick={() => updateOrderStatus(order.id, "delivered")}
                              disabled={actionLoading === `order-${order.id}-delivered`}
                              className="w-full md:w-auto px-8 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition flex items-center justify-center gap-2"
                            >
                              <Truck className="w-4 h-4" />
                              Mark Delivered
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="grid gap-3">
                  {deliveredHistory.map(order => (
                    <div key={order.id} className="premium-card bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between opacity-60 hover:opacity-100 transition">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{order.user_name}</p>
                          <p className="text-[10px] text-white/30">{formatDate(order.delivered_at)} • ID #{order.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-white">{formatAmount(order.total_amount)}</p>
                        <p className="text-[10px] text-white/30">{order.batch_id || "Direct Delivery"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "support" && (
                <div className="h-[600px] flex gap-4">
                  {/* Thread List */}
                  <div className="w-1/3 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/10 bg-white/5">
                      <h3 className="font-bold text-white">Conversations</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                      {supportThreads.map(thread => (
                        <div 
                          key={thread.id}
                          onClick={() => setActiveThread(thread)}
                          className={`p-4 cursor-pointer border-b border-white/5 transition ${
                            activeThread?.id === thread.id ? "bg-yellow-400/10" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-sm">{thread.username}</span>
                            <span className={`w-2 h-2 rounded-full ${thread.status === "open" ? "bg-green-400" : "bg-white/20"}`} />
                          </div>
                          <p className="text-[10px] text-white/40 truncate">Last active: {formatDate(thread.updated_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Chat Area */}
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                    {activeThread ? (
                      <>
                        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 font-bold">
                              {activeThread.username?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <span className="font-bold text-white">{activeThread.username || "User"}</span>
                          </div>
                          <button 
                            onClick={() => setActiveThread(null)}
                            className="text-xs text-white/40 hover:text-white"
                          >
                            Close Chat
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar bg-black/20">
                          {messages.map(m => (
                            <div 
                              key={m.id}
                              className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                m.sender_role === "admin" 
                                  ? "bg-yellow-400 text-black self-end rounded-tr-none" 
                                  : "bg-white/10 text-white self-start rounded-tl-none"
                              }`}
                            >
                              {m.message}
                              <p className={`text-[8px] mt-1 ${m.sender_role === "admin" ? "text-black/50" : "text-white/30"}`}>
                                {formatDate(m.created_at)}
                              </p>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={sendSupportMessage} className="p-4 border-t border-white/10 bg-white/5 flex gap-2">
                          <input 
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-yellow-400/50"
                          />
                          <button 
                            type="submit"
                            className="p-2 bg-yellow-400 text-black rounded-xl hover:bg-yellow-300 transition"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-white/20">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-5" />
                        <p>Select a thread to start chatting</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "banners" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <div className="premium-card bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24">
                      <h3 className="text-xl font-bold text-white mb-6">
                        {editingBannerId ? "Edit Banner" : "Create New Banner"}
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] uppercase text-white/40 font-bold ml-1">Banner Image</label>
                          <input 
                            type="file" 
                            onChange={e => setBannerForm(prev => ({ ...prev, image: e.target.files[0] }))}
                            className="w-full mt-1 p-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs"
                          />
                        </div>
                        <input 
                          value={bannerForm.title}
                          onChange={e => setBannerForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Title"
                          className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-yellow-400/50"
                        />
                        <input 
                          value={bannerForm.subtitle}
                          onChange={e => setBannerForm(prev => ({ ...prev, subtitle: e.target.value }))}
                          placeholder="Subtitle"
                          className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-yellow-400/50"
                        />
                        <input 
                          value={bannerForm.link}
                          onChange={e => setBannerForm(prev => ({ ...prev, link: e.target.value }))}
                          placeholder="Redirect Link (Optional)"
                          className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-yellow-400/50"
                        />
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={bannerForm.clickable} 
                              onChange={e => setBannerForm(prev => ({ ...prev, clickable: e.target.checked }))}
                              className="w-4 h-4 rounded border-white/10 bg-black/40 text-yellow-400"
                            />
                            <span className="text-xs text-white/60 group-hover:text-white transition">Clickable</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={bannerForm.active} 
                              onChange={e => setBannerForm(prev => ({ ...prev, active: e.target.checked }))}
                              className="w-4 h-4 rounded border-white/10 bg-black/40 text-yellow-400"
                            />
                            <span className="text-xs text-white/60 group-hover:text-white transition">Active</span>
                          </label>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <button 
                            onClick={async () => {
                              try {
                                const fd = new FormData()
                                if (bannerForm.image) fd.append("image", bannerForm.image)
                                fd.append("title", bannerForm.title)
                                fd.append("subtitle", bannerForm.subtitle)
                                fd.append("link", bannerForm.link)
                                fd.append("clickable", String(bannerForm.clickable))
                                fd.append("active", String(bannerForm.active))
                                
                                setActionLoading("banner-save")
                                if (editingBannerId) {
                                  await API.put(`/admin/banners/${editingBannerId}`, fd)
                                  toast.success("Banner updated")
                                } else {
                                  await API.post("/admin/banners", fd)
                                  toast.success("Banner created")
                                }
                                setEditingBannerId(null)
                                setBannerForm({ title: "", subtitle: "", link: "", clickable: false, active: true, image: null })
                                fetchData()
                              } catch (err) {
                                toast.error(getApiErrorMessage(err))
                              } finally {
                                setActionLoading("")
                              }
                            }}
                            className="flex-1 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition"
                          >
                            {editingBannerId ? "Save Changes" : "Create Banner"}
                          </button>
                          {editingBannerId && (
                            <button 
                              onClick={() => {
                                setEditingBannerId(null)
                                setBannerForm({ title: "", subtitle: "", link: "", clickable: false, active: true, image: null })
                              }}
                              className="p-3 bg-white/10 text-white rounded-xl"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    {banners.map(banner => (
                      <div key={banner.id} className="premium-card bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-center">
                        <img 
                          src={banner.image_url?.startsWith("http") ? banner.image_url : `${API_BASE_URL}${banner.image_url || ""}`} 
                          className="w-32 h-20 object-cover rounded-xl border border-white/10 bg-white/5"
                          alt="Banner"
                          onError={(e) => { e.target.src = "https://via.placeholder.com/400x200?text=Banner+Image" }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white truncate">{banner.title}</h4>
                          <p className="text-xs text-white/40 truncate">{banner.subtitle}</p>
                          <div className="flex gap-2 mt-2">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${banner.active ? "bg-green-400/20 text-green-400" : "bg-white/10 text-white/40"}`}>
                              {banner.active ? "ACTIVE" : "INACTIVE"}
                            </span>
                            {banner.clickable && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-blue-400/20 text-blue-400 rounded">CLICKABLE</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingBannerId(banner.id)
                              setBannerForm({
                                title: banner.title || "",
                                subtitle: banner.subtitle || "",
                                link: banner.link || "",
                                clickable: banner.clickable,
                                active: banner.active,
                                image: null
                              })
                            }}
                            className="p-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (!window.confirm("Delete banner?")) return
                              try {
                                await API.delete(`/admin/banners/${banner.id}`)
                                toast.success("Banner deleted")
                                fetchData()
                              } catch {
                                toast.error("Failed to delete")
                              }
                            }}
                            className="p-2 bg-red-400/10 text-red-400 rounded-lg hover:bg-red-400 hover:text-black transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Batch Detail Modal */}
      {selectedBatch && (
        <BatchDetailModal 
          batchId={selectedBatch} 
          onClose={() => setSelectedBatch(null)} 
        />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .thin-scrollbar::-webkit-scrollbar { width: 4px; }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  )
}

function BatchDetailModal({ batchId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await API.get(`/admin/batches/${batchId}`)
        setData(res.data)
      } catch {
        toast.error("Failed to load batch details")
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [batchId])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div>
            <h2 className="text-2xl font-black text-white">{data?.batch_id || "Loading..."}</h2>
            <p className="text-xs text-white/40">Consolidated Production View</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-white/40 hover:text-white">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Section 1: Standard Books */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-yellow-400" />
                  <h3 className="font-bold text-white text-lg">Consolidated Standard Books</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data?.consolidated?.map((item, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{item.item_name}</p>
                        <p className="text-[10px] text-white/40">{item.mode} | {item.print_type}</p>
                      </div>
                      <div className="text-2xl font-black text-yellow-400">x{item.total_quantity}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 2: Custom Items */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-white text-lg">Customized Orders</h3>
                </div>
                <div className="grid gap-3">
                  {data?.custom_items?.map((item, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center text-blue-400">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{item.item_name}</p>
                          <p className="text-[10px] text-white/40">{item.user_name} • {item.total_pages} Pages • {item.mode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="px-2 py-1 bg-blue-400 text-black text-[8px] font-bold rounded">CUSTOM</span>
                        <div className="text-xl font-black text-white">x{item.quantity}</div>
                        <a 
                          href={`${API_BASE_URL}/uploads/${item.stored_filename}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 3: Delivery Assembly Preview */}
              <section className="bg-white/5 p-6 rounded-3xl border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4 text-green-400" />
                  <h3 className="font-bold text-white text-lg">Delivery Assembly Preview</h3>
                </div>
                <div className="space-y-4">
                  {data?.orders?.map(order => (
                    <div key={order.id} className="p-3 border-b border-white/5 last:border-0">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-white text-sm">{order.user_name}</p>
                        <p className="text-[10px] text-white/40">{order.hostel || order.hostel_name}</p>
                      </div>
                      <p className="text-[10px] text-yellow-400/70 mt-1">
                        {order.items?.map(it => `${it.item_name} x${it.quantity} (${it.item_type || "Book"}, ${it.mode || "-"}, ${it.print_type || "-"})`).join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default Admin


