import { useEffect, useState } from "react"
import API, { API_BASE_URL } from "../api/api"

function Admin() {
  const [orders, setOrders] = useState([])
  const [printSummary, setPrintSummary] = useState([])
  const [books, setBooks] = useState([])
  const [activeSection, setActiveSection] = useState("books")
  const [newBook, setNewBook] = useState({ name: "", year: "" })
  const [newOption, setNewOption] = useState({
    book_id: "",
    mode: "",
    print_type: "single",
    price: "",
  })

  const fetchOrders = async () => {
    try {
      const res = await API.get("/admin/orders")
      setOrders(res.data)
    } catch (err) {
      console.log(err)
      alert("Admin access required")
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
    }
  }

  const fetchPrintSummary = async () => {
    try {
      const res = await API.get("/admin/print-summary")
      setPrintSummary(res.data)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchBooks()
    fetchPrintSummary()
  }, [])

  const updateStatus = async (id, status) => {

    try {

      await API.put(`/admin/orders/${id}/status?status=${status}`)

      alert("Order updated")

      fetchOrders()
      fetchPrintSummary()

    } catch {

      alert("Failed to update")

    }

  }

  const markAllPrinted = async () => {
    try {
      await API.post("/admin/print-complete")
      alert("Print summary reset")
      fetchPrintSummary()
    } catch (error) {
      console.log(error)
      alert("Failed to mark all printed")
    }
  }

  const createBook = async () => {
    if (!newBook.name || !newBook.year) {
      alert("Enter book name and year")
      return
    }

    try {
      await API.post("/admin/books", newBook)
      setNewBook({ name: "", year: "" })
      fetchBooks()
      alert("Book created")
    } catch (error) {
      console.log(error)
      alert("Failed to create book")
    }
  }

  const createBookOption = async () => {
    if (!newOption.book_id || !newOption.mode || !newOption.price) {
      alert("Fill all option fields")
      return
    }

    try {
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
      fetchBooks()
      alert("Book option added")
    } catch (error) {
      console.log(error)
      alert("Failed to add option")
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
      await API.put(`/admin/book-options/${option.id}`, {
        mode: option.mode,
        print_type: option.print_type,
        price: Number(option.price),
      })
      fetchBooks()
      alert("Option updated")
    } catch (error) {
      console.log(error)
      alert("Failed to update option")
    }
  }

  const deleteOption = async (optionId) => {
    try {
      await API.delete(`/admin/book-options/${optionId}`)
      fetchBooks()
      alert("Option deleted")
    } catch (error) {
      console.log(error)
      alert("Failed to delete option")
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const paidOrders = orders.filter((order) => order.status !== "pending")
  const todaysOrders = paidOrders.filter((order) => {
    if (!order.created_at) {
      return false
    }
    return order.created_at.slice(0, 10) === today
  })
  const deliveryOrders = paidOrders.filter((order) =>
    ["paid", "printing", "ready"].includes(order.status)
  )

  return (

    <div className="pt-24 px-4 pb-24">

      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-sm">
            Orders Received Today
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {todaysOrders.length}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-gray-400 text-sm">
            Total Books
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {books.length}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-400 text-sm">
                Bulk Print Summary
              </p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {printSummary.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
            </div>

            <button
              onClick={markAllPrinted}
              className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-semibold"
            >
              Mark All Printed
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

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveSection("books")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "books"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Books
        </button>

        <button
          onClick={() => setActiveSection("orders")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "orders"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Order Status
        </button>

        <button
          onClick={() => setActiveSection("delivery")}
          className={`flex-1 py-3 rounded-xl border transition ${
            activeSection === "delivery"
              ? "bg-yellow-400 text-black border-yellow-400"
              : "bg-white/5 border-white/10 text-gray-300"
          }`}
        >
          Delivery
        </button>
      </div>

      {activeSection === "books" && (
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
                className="bg-yellow-400 text-black py-2 rounded-xl font-semibold"
              >
                Add Book
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
                className="bg-yellow-400 text-black py-2 rounded-xl font-semibold"
              >
                Add Option
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              Books & Pricing
            </h2>

            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
              >
                <p className="text-gray-200 font-semibold">
                  {book.name}
                </p>

                <p className="text-gray-400 text-sm mb-3">
                  {book.year}
                </p>

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
                        className="bg-green-500 text-black px-3 py-2 rounded"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => deleteOption(option.id)}
                        className="bg-red-500 text-black px-3 py-2 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {activeSection === "orders" && (
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
                  className="bg-yellow-400 text-black px-3 py-1 rounded"
                >
                  Printing
                </button>

                <button
                  onClick={() => updateStatus(order.id, "ready")}
                  className="bg-green-500 text-black px-3 py-1 rounded"
                >
                  Ready
                </button>

                <button
                  onClick={() => updateStatus(order.id, "delivered")}
                  className="bg-blue-500 text-black px-3 py-1 rounded"
                >
                  Delivered
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {activeSection === "delivery" && (
        <>
          {deliveryOrders.length === 0 && (
            <p className="text-gray-400">
              No delivery orders available
            </p>
          )}

          {deliveryOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-gray-200 font-semibold">
                    {order.user?.username || "Unknown user"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Order ID: {order.id}
                  </p>
                </div>

                <p className="text-yellow-400 font-semibold">
                  {order.status}
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-300">
                  Delivery Type: <span className="text-gray-400">{order.delivery_type || "-"}</span>
                </p>

                <p className="text-gray-300">
                  Delivery Location: <span className="text-gray-400">{order.hostel_name || "Day Scholar / Not provided"}</span>
                </p>

                <p className="text-gray-300">
                  Contact: <span className="text-gray-400">{order.contact_number || "-"}</span>
                </p>

                <p className="text-gray-300">
                  Alternate Contact: <span className="text-gray-400">{order.alternate_contact_number || "-"}</span>
                </p>

                <p className="text-gray-300">
                  Amount Paid: <span className="text-yellow-400">₹{order.total_amount}</span>
                </p>
              </div>

              <div className="mt-4 border-t border-white/5 pt-3">
                <p className="text-gray-300 font-medium mb-2">
                  Items To Deliver
                </p>

                {(order.items || []).map((item) => (
                  <div key={item.id} className="mb-2 last:mb-0">
                    <p className="text-gray-300 text-sm">
                      {item.item_name || "Unnamed item"}
                    </p>

                    <p className="text-gray-500 text-xs">
                      {item.mode || "-"} • {item.print_type === "single" ? "Single Side" : item.print_type === "double" ? "Double Side" : item.print_type || "-"} • Qty {item.quantity}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => updateStatus(order.id, "ready")}
                  className="bg-green-500 text-black px-3 py-1 rounded"
                >
                  Mark Ready
                </button>

                <button
                  onClick={() => updateStatus(order.id, "delivered")}
                  className="bg-blue-500 text-black px-3 py-1 rounded"
                >
                  Mark Delivered
                </button>
              </div>
            </div>
          ))}
        </>
      )}

    </div>

  )

}

export default Admin
