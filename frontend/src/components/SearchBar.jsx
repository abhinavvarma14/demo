import { Search } from "lucide-react"

function SearchBar({ value, onChange, placeholder = "Search books" }) {
  return (
    <div className="relative">
      <div className={`admin-search flex items-center rounded-full border px-4 py-3 backdrop-blur-xl ${
        value ? "border-yellow-400/25 bg-white/10" : "border-white/10 bg-white/5"
      }`}>
        <Search size={18} className="text-gray-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="ml-3 w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
        />
      </div>
    </div>
  )
}

export default SearchBar
