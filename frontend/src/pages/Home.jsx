import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Upload } from "lucide-react"
import API from "../api/api"
import BookCard from "../components/BookCard"

function Home(){
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await API.get("/books")
        setBooks(res.data)
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()
  }, [])

  return(

    <div className="pt-28 pb-24 px-4">

      {/* Books Grid */}

      <div className="grid grid-cols-2 gap-4">
        {loading && (
          <div className="col-span-2 text-gray-400">
            Loading books...
          </div>
        )}

        {!loading && books.length === 0 && (
          <div className="col-span-2 text-gray-400">
            No books available right now.
          </div>
        )}

        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}

      </div>

      {/* Upload Custom PDF Card */}

      <div
        onClick={()=>navigate("/upload")}
        className="mt-6 bg-white/5 backdrop-blur-xl border border-white/10 
        rounded-2xl p-6 flex flex-col items-center justify-center
        hover:border-yellow-400 transition cursor-pointer"
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
