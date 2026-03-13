import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Upload } from "lucide-react"
import API from "../api/api"
import BookCard from "../components/BookCard"
import SearchBar from "../components/SearchBar"
import toast from "react-hot-toast"
import { getApiErrorMessage } from "../utils/apiError"

function Home(){
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [search, setSearch] = useState("")
  const [selectedYear, setSelectedYear] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await API.get("/books")
        setBooks(res.data)
      } catch (error) {
        console.log(error)
        toast.error(getApiErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()
  }, [])

  const years = ["all", ...new Set(books.map((book) => (book.year || "").toLowerCase()).filter(Boolean))]

  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.name.toLowerCase().includes(search.trim().toLowerCase())
    const matchesYear = selectedYear === "all" || (book.year || "").toLowerCase() === selectedYear
    return matchesSearch && matchesYear
  })

  return(

    <div className="pt-28 pb-24 px-4">
      <div className="mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search books, years, or editions"
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              selectedYear === year
                ? "border-yellow-400 bg-yellow-400 text-black"
                : "border-white/10 bg-white/5 text-gray-300"
            }`}
          >
            {year === "all" ? "All Years" : year.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Books Grid */}

      <div className="grid grid-cols-2 gap-3">
        {loading && (
          <>
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="bg-white/5 border border-white/10 rounded-2xl p-4 h-40 animate-pulse" />
            ))}
          </>
        )}

        {!loading && filteredBooks.length === 0 && (
          <div className="col-span-2 text-gray-400">
            No books available right now.
          </div>
        )}

        {filteredBooks.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}

      </div>

      {/* Upload Custom PDF Card */}

      <div
        onClick={()=>navigate("/upload")}
        className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 
        rounded-2xl p-6 flex flex-col items-center justify-center
        hover:border-yellow-400 transition cursor-pointer shadow-lg"
      >

        <Upload size={36} className="text-yellow-400 mb-3"/>

        <h2 className="text-lg font-semibold">
          Upload Custom PDF
        </h2>

        <p className="text-gray-400 text-sm mt-1 text-center">
          Can't find your book? Upload your PDF and print it.
        </p>

      </div>

    </div>

  )

}

export default Home
