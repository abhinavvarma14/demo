import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import API, { API_BASE_URL } from "../api/api"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

function Admin({ defaultSection = "orders" }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [printSummary, setPrintSummary] = useState([])
  const [books, setBooks] = useState([])
  const [banners, setBanners] = useState([])
  const [supportThreads, setSupportThreads] = useState([])
  const [analytics, setAnalytics] = useState({
    total_orders: 0,
    pending_orders: 0,
    printing_orders: 0,
    completed_orders: 0,
    total_revenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState("")
  const [activeSection, setActiveSection] = useState(defaultSection)
  const [newBook, setNewBook] = useState({ name: "", year: "", requires_details: false, is_pinned: false })
  const [supportReplies, setSupportReplies] = useState({})
  const [editingBannerId, setEditingBannerId] = useState("")
  const [newOption, setNewOption] = useState({
    book_id: "",
    mode: "",
    print_type: "",
    price: "",
  })
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    link: "",
    clickable: false,
    active: true,
    image: null,
  })

  useEffect(() => {
    setActiveSection(defaultSection)
  }, [defaultSection])

  const fetchOrders = async () => {
    try {
      const res = await API.get("/admin/orders")
      setOrders(res.data)
    } catch (err) {
      console.log(err)
      toast.error(getApiErrorMessage(err))
    }
  }

  const fetchBooks = async () => {
    try {
      const res = await API.get("/admin/books")
      setBooks(res.data)
      if (!newOption.book_id && res.data.length > 0) {
        setNewOption((current) => ({
          ...current,
          book_id: String(res.data[0].id),
        }))
      }
    } catch (err) {
      console.log(err)
      toast.error(getApiErrorMessage(err))
    }
  }

  const fetchPrintSummary = async () => {
    try {
      const res = await API.get("/admin/print-queue")
      setPrintSummary(res.data)
    } catch (err) {
      console.log(err)
      toast.error(getApiErrorMessage(err))
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await API.get("/admin/dashboard")
      setAnalytics(res.data)
    } catch (err) {
      console.log(err)
      toast.error(getApiErrorMessage(err))
    }
  }

  const fetchSupportThreads = async () => {
    try {
      const res = await API.get("/admin/support-threads")
      setSupportThreads(res.data)
    } catch (err) {
      console.log(err)
      toast.error(getApiErrorMessage(err))
    }
  }

  const fetchBanners = async () => {
    try {
      const res = await API.get("/admin/banners")
      setBanners(res.data)
    } catch (err) {
      console.log(err)
      toast.error(getApiErrorMessage(err))
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchOrders(), fetchBooks(), fetchBanners(), fetchPrintSummary(), fetchAnalytics(), fetchSupportThreads()])
      setLoading(false)
    }

    load()
  }, [])

  const refreshAdminData = async () => {
    await Promise.all([fetchOrders(), fetchBanners(), fetchPrintSummary(), fetchAnalytics(), fetchSupportThreads()])
  }

  const updateStatus = async (id, status) => {

    try {
      setActionLoading(`${id}-${status}`)

      await API.put(`/admin/orders/${id}/status?status=${status}`)
      toast.success("Order updated")

      await refreshAdminData()

    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to update"))

    } finally {
      setActionLoading("")
    }

  }

  const markAllPrinted = async () => {
    try {
      setActionLoading("print-complete")
      await API.post("/admin/print-complete")
      toast.success("Print summary reset")
      await refreshAdminData()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to mark all printed"))
    } finally {
      setActionLoading("")
    }
  }

  const resetRevenue = async () => {
    try {
      setActionLoading("reset-revenue")
      const res = await API.post("/admin/dashboard/reset-revenue")
      setAnalytics((current) => ({
        ...current,
        total_revenue: res.data.total_revenue ?? 0,
      }))
      toast.success("Revenue reset")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to reset revenue"))
    } finally {
      setActionLoading("")
    }
  }

  const startPrinting = async (item) => {
    try {
      setActionLoading(`queue-start-${item.item_name}-${item.mode}-${item.print_type}`)
      await API.post("/admin/print-queue/start", {
        item_name: item.item_name,
        mode: item.mode,
        print_type: item.print_type,
      })
      toast.success("Printing started")
      await refreshAdminData()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to start printing"))
    } finally {
      setActionLoading("")
    }
  }

  const markQueueItemPrinted = async (item) => {
    try {
      setActionLoading(`queue-complete-${item.item_name}-${item.mode}-${item.print_type}`)
      await API.post("/admin/print-queue/complete", {
        item_name: item.item_name,
        mode: item.mode,
        print_type: item.print_type,
      })
      toast.success("Queue item marked printed")
      await refreshAdminData()
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to mark queue item printed"))
    } finally {
      setActionLoading("")
    }
  }

  const createBook = async () => {
    if (!newBook.name || !newBook.year) {
      toast.error("Enter book name and year")
      return
    }

    try {
      setActionLoading("create-book")
      await API.post("/admin/books", newBook)
      setNewBook({ name: "", year: "", requires_details: false, is_pinned: false })
      await fetchBooks()
      toast.success("Book created")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to create book"))
    } finally {
      setActionLoading("")
    }
  }

  const createBookOption = async () => {
    if (!newOption.book_id || !newOption.price) {
      toast.error("Fill book and price")
      return
    }

    try {
      setActionLoading("create-option")
      await API.post("/admin/book-options", {
        book_id: Number(newOption.book_id),
        mode: newOption.mode,
        print_type: newOption.print_type,
        price: Number(newOption.price),
      })
      setNewOption((current) => ({
        ...current,
        mode: "",
        print_type: "",
        price: "",
      }))
      await fetchBooks()
      toast.success("Book option added")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to add option"))
    } finally {
      setActionLoading("")
    }
  }

  const handleOptionChange = (bookId, optionId, field, value) => {
    setBooks((currentBooks) =>
      currentBooks.map((book) => {
        if (book.id !== bookId) return book
        return {
          ...book,
          options: (book.options || []).map((option) =>
            option.id === optionId ? { ...option, [field]: value } : option
          ),
        }
      })
    )
  }

  const saveOption = async (bookId, option) => {
    try {
      setActionLoading(`save-option-${option.id}`)
      await API.put(`/admin/book-options/${option.id}`, {
        mode: option.mode,
        print_type: option.print_type,
        price: Number(option.price),
      })
      await fetchBooks()
      toast.success("Option updated")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to update option"))
    } finally {
      setActionLoading("")
    }
  }

  const deleteOption = async (optionId) => {
    try {
      setActionLoading(`delete-option-${optionId}`)
      await API.delete(`/admin/book-options/${optionId}`)
      await fetchBooks()
      toast.success("Option deleted")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to delete option"))
    } finally {
      setActionLoading("")
    }
  }

  const handleBookChange = (bookId, field, value) => {
    setBooks((currentBooks) =>
      currentBooks.map((book) =>
        book.id === bookId ? { ...book, [field]: value } : book
      )
    )
  }

  const saveBook = async (book) => {
    try {
      setActionLoading(`save-book-${book.id}`)
      await API.put(`/admin/books/${book.id}`, {
        name: book.name,
        year: book.year,
        is_active: book.is_active,
        requires_details: !!book.requires_details,
        is_pinned: !!book.is_pinned,
      })
      await fetchBooks()
      toast.success("Book updated")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to update book"))
    } finally {
      setActionLoading("")
    }
  }

  const deleteBook = async (bookId) => {
    try {
      setActionLoading(`delete-book-${bookId}`)
      await API.delete(`/admin/books/${bookId}`)
      await fetchBooks()
      toast.success("Book deleted")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to delete book"))
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
      if (bannerForm.image) {
        formData.append("image", bannerForm.image)
      }
      formData.append("title", bannerForm.title)
      formData.append("subtitle", bannerForm.subtitle)
      formData.append("link", bannerForm.link)
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
      formData.append("link", banner.link || "")
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
      if (editingBannerId === bannerId) {
        resetBannerForm()
      }
      toast.success("Banner deleted")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to delete banner"))
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

  const replyToSupportThread = async (threadId) => {
    const message = (supportReplies[threadId] || "").trim()
    if (!message) {
      toast.error("Enter a reply")
      return
    }

    try {
      setActionLoading(`support-reply-${threadId}`)
      const res = await API.post(`/admin/support-threads/${threadId}/reply`, {
        message,
      })
      setSupportThreads((current) =>
        current.map((thread) => (thread.id === threadId ? res.data : thread))
      )
      setSupportReplies((current) => ({ ...current, [threadId]: "" }))
      toast.success("Reply sent")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to reply"))
    } finally {
      setActionLoading("")
    }
  }

  const bulkCopies = printSummary.reduce((sum, item) => sum + item.quantity, 0)

  const goToSection = (section) => {
    setActiveSection(section)
    if (section === "books") {
      navigate("/admin/books")
      return
    }
    if (section === "banners") {
      navigate("/admin/banners")
      return
    }
    if (section === "printQueue") {
      navigate("/admin/print-queue")
      return
    }
    navigate("/admin")
  }

  return (

    <div className="pt-24 px-4 pb-24">

      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-sm">
            Total Orders
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {analytics.total_orders}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-sm">
            Pending Orders
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {analytics.pending_orders}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-sm">
            Printing Orders
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {analytics.printing_orders}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-sm">
            Completed Orders
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {analytics.completed_orders}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-400 text-sm">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                ₹{Number(analytics.total_revenue || 0).toFixed(2)}
              </p>
            </div>

            <button
              onClick={resetRevenue}
              disabled={actionLoading === "reset-revenue"}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              {actionLoading === "reset-revenue" ? "Processing..." : "Reset Revenue"}
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-400 text-sm">
                Bulk Print Summary
              </p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {bulkCopies}
              </p>
            </div>

            <button
              onClick={markAllPrinted}
              disabled={actionLoading === "print-complete"}
              className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-semibold"
            >
              {actionLoading === "print-complete" ? "Processing..." : "Mark Printed"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="pb-2 font-normal">
                    Book Name
                  </th>
                  <th className="pb-2 font-normal">
                    Mode
                  </th>
                  <th className="pb-2 font-normal">
                    Print Type
                  </th>
                  <th className="pb-2 font-normal">
                    Total Copies
                  </th>
                </tr>
              </thead>

              <tbody>
                {printSummary.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-3 text-gray-500">
                      No pending bulk print items
                    </td>
                  </tr>
                )}

                {printSummary.map((item) => (
                  <tr key={`${item.item_name}-${item.mode}-${item.print_type}`} className="border-t border-white/5">
                    <td className="py-3 text-gray-300">
                      {item.item_name}
                    </td>
                    <td className="py-3 text-gray-400">
                      {item.mode || "-"}
                    </td>
                    <td className="py-3 text-gray-400">
                      {item.print_type === "single" ? "Single" : item.print_type === "double" ? "Double" : item.print_type || "-"}
                    </td>
                    <td className="py-3 text-yellow-400">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 h-40 animate-pulse" />
      )}

      {!loading && <div className="flex gap-3 mb-6">
        <button
          onClick={() => goToSection("books")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "books"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Books
        </button>

        <button
          onClick={() => goToSection("orders")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "orders"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Order Status
        </button>

        <button
          onClick={() => goToSection("printQueue")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "printQueue"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Print Queue
        </button>

        <button
          onClick={() => goToSection("banners")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "banners"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Banners
        </button>

        <button
          onClick={() => goToSection("support")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "support"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Support
        </button>
      </div>}

      {!loading && activeSection === "books" && (
        <>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Create Book
            </h2>

            <div className="grid gap-3">
              <input
                value={newBook.name}
                onChange={(event) => setNewBook((current) => ({ ...current, name: event.target.value }))}
                placeholder="Book name"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <input
                value={newBook.year}
                onChange={(event) => setNewBook((current) => ({ ...current, year: event.target.value }))}
                placeholder="Year"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={newBook.requires_details}
                  onChange={(event) =>
                    setNewBook((current) => ({
                      ...current,
                      requires_details: event.target.checked,
                    }))
                  }
                />
                Special request card
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={newBook.is_pinned}
                  onChange={(event) =>
                    setNewBook((current) => ({
                      ...current,
                      is_pinned: event.target.checked,
                    }))
                  }
                />
                Pin this book to top
              </label>

              <button
                onClick={createBook}
                disabled={actionLoading === "create-book"}
                className="bg-yellow-400 text-black py-2 rounded-xl font-semibold"
              >
                {actionLoading === "create-book" ? "Processing..." : "Add Book"}
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              Add Book Option
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              For a simple fixed-price book, keep both Mode and Side Selection empty.
            </p>

            <div className="grid gap-3">
              <select
                value={newOption.book_id}
                onChange={(event) => setNewOption((current) => ({ ...current, book_id: event.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              >
                <option value="">
                  Select book
                </option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
              </select>

              <input
                value={newOption.mode}
                onChange={(event) => setNewOption((current) => ({ ...current, mode: event.target.value }))}
                placeholder="Mode (optional, e.g. A or R)"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <select
                value={newOption.print_type}
                onChange={(event) => setNewOption((current) => ({ ...current, print_type: event.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              >
                <option value="">
                  No side selection (simple book)
                </option>
                <option value="single">
                  Single
                </option>
                <option value="double">
                  Double
                </option>
              </select>

              <input
                type="number"
                value={newOption.price}
                onChange={(event) => setNewOption((current) => ({ ...current, price: event.target.value }))}
                placeholder="Price"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <button
                onClick={createBookOption}
                disabled={actionLoading === "create-option"}
                className="bg-yellow-400 text-black py-2 rounded-xl font-semibold"
              >
                {actionLoading === "create-option" ? "Processing..." : "Add Option"}
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              Books & Pricing
            </h2>

            {books.length === 0 && (
              <p className="text-gray-400">
                No books available
              </p>
            )}

            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
              >
                <div className="grid gap-3 mb-3">
                  <input
                    value={book.name}
                    onChange={(event) => handleBookChange(book.id, "name", event.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl p-3"
                  />

                  <input
                    value={book.year}
                    onChange={(event) => handleBookChange(book.id, "year", event.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl p-3"
                  />

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={!!book.requires_details}
                      onChange={(event) => handleBookChange(book.id, "requires_details", event.target.checked)}
                    />
                    Special request card
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={!!book.is_pinned}
                      onChange={(event) => handleBookChange(book.id, "is_pinned", event.target.checked)}
                    />
                    Pin this book to top
                  </label>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => saveBook(book)}
                    disabled={actionLoading === `save-book-${book.id}`}
                    className="bg-green-500 text-black px-3 py-2 rounded"
                  >
                    {actionLoading === `save-book-${book.id}` ? "Processing..." : "Save Book"}
                  </button>

                  <button
                    onClick={() => deleteBook(book.id)}
                    disabled={actionLoading === `delete-book-${book.id}`}
                    className="bg-red-500 text-black px-3 py-2 rounded"
                  >
                    {actionLoading === `delete-book-${book.id}` ? "Processing..." : "Delete Book"}
                  </button>
                </div>

                {(book.options || []).length === 0 && (
                  <p className="text-gray-500 text-sm">
                    No pricing options yet
                  </p>
                )}

                {(book.options || []).map((option) => (
                  <div key={option.id} className="border-t border-white/5 pt-3 mt-3">
                    <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                      {!option.mode && !option.print_type ? "Simple fixed price option" : "Book option"}
                    </p>
                    <div className="grid gap-3">
                      <input
                        value={option.mode || ""}
                        onChange={(event) => handleOptionChange(book.id, option.id, "mode", event.target.value)}
                        placeholder="Mode (optional)"
                        className="bg-white/5 border border-white/10 rounded-xl p-3"
                      />

                      <select
                        value={option.print_type || ""}
                        onChange={(event) => handleOptionChange(book.id, option.id, "print_type", event.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl p-3"
                      >
                        <option value="">
                          No side selection (simple book)
                        </option>
                        <option value="single">
                          Single
                        </option>
                        <option value="double">
                          Double
                        </option>
                      </select>

                      <input
                        type="number"
                        value={option.price ?? ""}
                        onChange={(event) => handleOptionChange(book.id, option.id, "price", event.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl p-3"
                      />
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => saveOption(book.id, option)}
                        disabled={actionLoading === `save-option-${option.id}`}
                        className="bg-green-500 text-black px-3 py-2 rounded"
                      >
                        {actionLoading === `save-option-${option.id}` ? "Processing..." : "Save"}
                      </button>

                      <button
                        onClick={() => deleteOption(option.id)}
                        disabled={actionLoading === `delete-option-${option.id}`}
                        className="bg-red-500 text-black px-3 py-2 rounded"
                      >
                        {actionLoading === `delete-option-${option.id}` ? "Processing..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && activeSection === "orders" && (
        <>
          {orders.length === 0 && (
            <p className="text-gray-400">
              No orders yet
            </p>
          )}

          {orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-xl border p-4 mb-4 transition ${
                order.status === "delivered"
                  ? "bg-white/5 border-green-500/30 opacity-75"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div className={order.status === "delivered" ? "line-through decoration-green-500/70" : ""}>
                <p className="text-gray-300">
                  Order ID: {order.id}
                </p>

                <p className="text-gray-300">
                  Amount: ₹{order.total_amount}
                </p>

                <p className="text-gray-300">
                  Status: {order.status}
                </p>

                <p className="text-gray-400 text-sm">
                  Contact: {order.contact_number}
                </p>

                <p className="text-gray-400 text-sm">
                  User: {order.user?.username}
                </p>

                <div className="mt-3 space-y-2">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="border-t border-white/5 pt-2">
                    <p className="text-gray-300 text-sm">
                      {item.item_name || "Unnamed item"} • ₹{item.total_price}
                    </p>

                    <p className="text-gray-500 text-xs">
                      {item.mode || "-"} • {item.print_type === "single" ? "Single Side" : item.print_type === "double" ? "Double Side" : item.print_type || "-"} • Qty {item.quantity}
                    </p>

                    {item.leave_date && (
                      <p className="text-gray-500 text-xs mt-1">
                        Leave: {item.leave_date}{item.leave_to_date ? ` to ${item.leave_to_date}` : ""}
                      </p>
                    )}

                    {item.request_reason && (
                      <p className="text-gray-500 text-xs mt-1">
                        Reason: {item.request_reason}
                      </p>
                    )}

                    {item.stored_filename && (
                      <div className="mt-2 flex gap-2">
                        <a
                          href={`${API_BASE_URL}/uploads/${item.stored_filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-yellow-400 underline text-sm"
                        >
                          Download PDF
                        </a>

                        <button
                          onClick={() => deleteUploadedFile(item.id)}
                          disabled={actionLoading === `delete-file-${item.id}`}
                          className="text-red-400 text-sm"
                        >
                          {actionLoading === `delete-file-${item.id}` ? "Deleting..." : "Delete File"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => updateStatus(order.id, "printing")}
                  disabled={actionLoading === `${order.id}-printing` || order.status === "delivered"}
                  className="bg-yellow-400 text-black px-3 py-1 rounded"
                >
                  {actionLoading === `${order.id}-printing` ? "Processing..." : "Printing"}
                </button>

                <button
                  onClick={() => updateStatus(order.id, "ready")}
                  disabled={actionLoading === `${order.id}-ready` || order.status === "delivered"}
                  className="bg-green-500 text-black px-3 py-1 rounded"
                >
                  {actionLoading === `${order.id}-ready` ? "Processing..." : "Ready"}
                </button>

                <button
                  onClick={() => updateStatus(order.id, "delivered")}
                  disabled={actionLoading === `${order.id}-delivered` || order.status === "delivered"}
                  className="bg-blue-500 text-black px-3 py-1 rounded"
                >
                  {order.status === "delivered"
                    ? "Delivered"
                    : actionLoading === `${order.id}-delivered`
                      ? "Processing..."
                      : "Delivered"}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {!loading && activeSection === "printQueue" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                Printer Queue
              </h2>
              <p className="text-sm text-gray-400">
                Grouped bulk items waiting to be printed
              </p>
            </div>

            <button
              onClick={markAllPrinted}
              disabled={actionLoading === "print-complete"}
              className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-semibold"
            >
              {actionLoading === "print-complete" ? "Processing..." : "Mark Printed"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-400">
                  <th className="pb-3 font-normal">
                    Book
                  </th>
                  <th className="pb-3 font-normal">
                    Mode
                  </th>
                  <th className="pb-3 font-normal">
                    Print
                  </th>
                  <th className="pb-3 font-normal">
                    Copies
                  </th>
                  <th className="pb-3 font-normal">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {printSummary.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-3 text-gray-500">
                      No pending bulk print items
                    </td>
                  </tr>
                )}

                {printSummary.map((item) => {
                  const queueKey = `${item.item_name}-${item.mode}-${item.print_type}`
                  const startKey = `queue-start-${item.item_name}-${item.mode}-${item.print_type}`
                  const completeKey = `queue-complete-${item.item_name}-${item.mode}-${item.print_type}`

                  return (
                    <tr key={queueKey} className="border-t border-white/5">
                      <td className="py-3 text-gray-300">
                        {item.item_name}
                      </td>
                      <td className="py-3 text-gray-400">
                        {item.mode || "-"}
                      </td>
                      <td className="py-3 text-gray-400">
                        {item.print_type === "single" ? "Single" : item.print_type === "double" ? "Double" : item.print_type || "-"}
                      </td>
                      <td className="py-3 text-yellow-400">
                        {item.quantity}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startPrinting(item)}
                            disabled={actionLoading === startKey}
                            className="bg-yellow-400 text-black px-3 py-1 rounded"
                          >
                            {actionLoading === startKey ? "Processing..." : "Start Printing"}
                          </button>

                          <button
                            onClick={() => markQueueItemPrinted(item)}
                            disabled={actionLoading === completeKey}
                            className="bg-green-500 text-black px-3 py-1 rounded"
                          >
                            {actionLoading === completeKey ? "Processing..." : "Mark Printed"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeSection === "banners" && (
        <>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Banner Management
                </h2>
                <p className="text-sm text-gray-400">
                  Manage the home page slider without changing the rest of the layout.
                </p>
              </div>

              {editingBannerId && (
                <button
                  onClick={resetBannerForm}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setBannerForm((current) => ({
                    ...current,
                    image: event.target.files?.[0] || null,
                  }))
                }
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <input
                value={bannerForm.title}
                onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Title (optional)"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <input
                value={bannerForm.subtitle}
                onChange={(event) => setBannerForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Subtitle (optional)"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <input
                value={bannerForm.link}
                onChange={(event) => setBannerForm((current) => ({ ...current, link: event.target.value }))}
                placeholder="Link (optional)"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={bannerForm.clickable}
                  onChange={(event) => setBannerForm((current) => ({ ...current, clickable: event.target.checked }))}
                />
                Clickable
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={bannerForm.active}
                  onChange={(event) => setBannerForm((current) => ({ ...current, active: event.target.checked }))}
                />
                Active
              </label>

              <button
                onClick={submitBanner}
                disabled={actionLoading === "banner-create" || actionLoading === `banner-save-${editingBannerId}`}
                className="bg-yellow-400 text-black py-2 rounded-xl font-semibold"
              >
                {editingBannerId
                  ? actionLoading === `banner-save-${editingBannerId}` ? "Processing..." : "Update Banner"
                  : actionLoading === "banner-create" ? "Processing..." : "Add Banner"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {banners.length === 0 && (
              <p className="text-gray-400">
                No banners yet
              </p>
            )}

            {banners.map((banner) => (
              <div key={banner.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex gap-4">
                  <img
                    src={/^https?:\/\//i.test(banner.image) ? banner.image : `${API_BASE_URL}${banner.image}`}
                    alt={banner.title || "Banner"}
                    className="h-20 w-28 rounded-xl object-cover border border-white/10"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white truncate">
                      {banner.title || "Untitled banner"}
                    </p>
                    <p className="mt-1 text-sm text-gray-400 truncate">
                      {banner.subtitle || "No subtitle"}
                    </p>
                    <p className="mt-1 text-xs text-white/45 truncate">
                      {banner.link || "No link"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleBannerActive(banner)}
                    disabled={actionLoading === `banner-toggle-${banner.id}`}
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white"
                  >
                    {actionLoading === `banner-toggle-${banner.id}`
                      ? "Processing..."
                      : banner.active ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => editBanner(banner)}
                    className="rounded-xl bg-yellow-400 px-3 py-2 text-sm font-semibold text-black"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteBanner(banner.id)}
                    disabled={actionLoading === `banner-delete-${banner.id}`}
                    className="rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-black"
                  >
                    {actionLoading === `banner-delete-${banner.id}` ? "Processing..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && activeSection === "support" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                User Help
              </h2>
              <p className="text-sm text-gray-400">
                User problems and admin replies
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/65">
              {supportThreads.length} threads
            </span>
          </div>

          {supportThreads.length === 0 && (
            <p className="text-gray-400">
              No help queries yet
            </p>
          )}

          {supportThreads.map((thread) => (
            <div key={thread.id} className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">
                    Query #{thread.id}
                  </p>
                  <p className="text-sm text-gray-400">
                    User: {thread.user?.username || "Unknown user"}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-yellow-400">
                  {thread.status}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {(thread.messages || []).map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      message.sender_role === "admin"
                        ? "bg-yellow-400/10 text-yellow-300"
                        : "bg-white/10 text-gray-200"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                      {message.sender_role === "admin" ? "Admin" : "User"}
                    </p>
                    <p className="mt-1">
                      {message.message}
                    </p>
                  </div>
                ))}
              </div>

              <textarea
                value={supportReplies[thread.id] || ""}
                onChange={(event) =>
                  setSupportReplies((current) => ({
                    ...current,
                    [thread.id]: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Write your reply..."
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3"
              />

              <button
                onClick={() => replyToSupportThread(thread.id)}
                disabled={actionLoading === `support-reply-${thread.id}`}
                className="mt-3 rounded-xl bg-yellow-400 px-4 py-2 font-semibold text-black"
              >
                {actionLoading === `support-reply-${thread.id}` ? "Processing..." : "Send Reply"}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>

  )

}

export default Admin
