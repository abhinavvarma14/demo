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
  const [newBook, setNewBook] = useState({ name: "", year: "" })
  const [supportReplies, setSupportReplies] = useState({})
  const [newOption, setNewOption] = useState({
    book_id: "",
    mode: "",
    print_type: "single",
    price: "",
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

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchOrders(), fetchBooks(), fetchPrintSummary(), fetchAnalytics(), fetchSupportThreads()])
      setLoading(false)
    }

    load()
  }, [])

  const refreshAdminData = async () => {
    await Promise.all([fetchOrders(), fetchPrintSummary(), fetchAnalytics(), fetchSupportThreads()])
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
      setNewBook({ name: "", year: "" })
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
    if (!newOption.book_id || !newOption.mode || !newOption.price) {
      toast.error("Fill all option fields")
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
        print_type: "single",
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

  const paidOrders = orders.filter((order) => order.status !== "pending")
  const bulkCopies = printSummary.reduce((sum, item) => sum + item.quantity, 0)

  const goToSection = (section) => {
    setActiveSection(section)
    if (section === "books") {
      navigate("/admin/books")
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
          <p className="text-gray-400 text-sm">
            Total Revenue
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            ₹{Number(analytics.total_revenue || 0).toFixed(2)}
          </p>
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
                placeholder="Mode (A / R / black_white)"
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              />

              <select
                value={newOption.print_type}
                onChange={(event) => setNewOption((current) => ({ ...current, print_type: event.target.value }))}
                className="bg-white/5 border border-white/10 rounded-xl p-3"
              >
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
                    <div className="grid gap-3">
                      <input
                        value={option.mode || ""}
                        onChange={(event) => handleOptionChange(book.id, option.id, "mode", event.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl p-3"
                      />

                      <select
                        value={option.print_type || "single"}
                        onChange={(event) => handleOptionChange(book.id, option.id, "print_type", event.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl p-3"
                      >
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
          {paidOrders.length === 0 && (
            <p className="text-gray-400">
              No paid orders yet
            </p>
          )}

          {paidOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
            >
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

                    {item.stored_filename && (
                      <a
                        href={`${API_BASE_URL}/uploads/${item.stored_filename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-400 underline text-sm block mt-1"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => updateStatus(order.id, "printing")}
                  disabled={actionLoading === `${order.id}-printing`}
                  className="bg-yellow-400 text-black px-3 py-1 rounded"
                >
                  {actionLoading === `${order.id}-printing` ? "Processing..." : "Printing"}
                </button>

                <button
                  onClick={() => updateStatus(order.id, "ready")}
                  disabled={actionLoading === `${order.id}-ready`}
                  className="bg-green-500 text-black px-3 py-1 rounded"
                >
                  {actionLoading === `${order.id}-ready` ? "Processing..." : "Ready"}
                </button>

                <button
                  onClick={() => updateStatus(order.id, "delivered")}
                  disabled={actionLoading === `${order.id}-delivered`}
                  className="bg-blue-500 text-black px-3 py-1 rounded"
                >
                  {actionLoading === `${order.id}-delivered` ? "Processing..." : "Delivered"}
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
