import { memo, useMemo, useState } from "react"
import { BookOpen, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react"
import API from "../../api/api"
import toast from "react-hot-toast"
import LoadingButton from "../LoadingButton"
import { getApiErrorMessage } from "../../utils/apiError"

const createOption = () => ({
  draftId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  mode: "",
  print_type: "",
  price: "",
  max_copies: "15",
})

const createBookForm = () => ({
  name: "",
  year: "",
  is_active: true,
  is_pinned: false,
  requires_details: false,
  options: [createOption()],
})

function BookCatalogManager({ books, loading, query, onRefresh }) {
  const [form, setForm] = useState(createBookForm)
  const [editingBookId, setEditingBookId] = useState(null)
  const [removedOptionIds, setRemovedOptionIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const visibleBooks = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return books
    return books.filter((book) => (
      book.name.toLowerCase().includes(term) || (book.year || "").toLowerCase().includes(term)
    ))
  }, [books, query])

  const resetForm = () => {
    setForm(createBookForm())
    setEditingBookId(null)
    setRemovedOptionIds([])
  }

  const startEditing = (book) => {
    setEditingBookId(book.id)
    setRemovedOptionIds([])
    setForm({
      name: book.name || "",
      year: book.year || "",
      is_active: Boolean(book.is_active),
      is_pinned: Boolean(book.is_pinned),
      requires_details: Boolean(book.requires_details),
      options: (book.options?.length ? book.options : [createOption()]).map((option) => ({
        id: option.id,
        draftId: String(option.id),
        mode: option.mode || "",
        print_type: option.print_type || "",
        price: String(option.price ?? ""),
        max_copies: String(option.max_copies || 15),
      })),
    })
  }

  const updateOption = (draftId, field, value) => {
    setForm((current) => ({
      ...current,
      options: current.options.map((option) => (
        option.draftId === draftId ? { ...option, [field]: value } : option
      )),
    }))
  }

  const removeOption = (option) => {
    if (form.options.length === 1) {
      toast.error("A book needs at least one pricing option")
      return
    }

    if (option.id) {
      setRemovedOptionIds((current) => [...current, option.id])
    }
    setForm((current) => ({
      ...current,
      options: current.options.filter((currentOption) => currentOption.draftId !== option.draftId),
    }))
  }

  const saveBook = async (event) => {
    event.preventDefault()
    if (saving) return

    const name = form.name.trim()
    const year = form.year.trim()
    if (!name || !year) {
      toast.error("Book name and year are required")
      return
    }

    const options = form.options.map((option) => ({
      ...option,
      price: Number(option.price),
      max_copies: Number(option.max_copies),
    }))
    if (options.some((option) => !Number.isFinite(option.price) || option.price <= 0)) {
      toast.error("Every pricing option needs a valid price")
      return
    }
    if (options.some((option) => !Number.isInteger(option.max_copies) || option.max_copies <= 0)) {
      toast.error("Maximum copies must be a positive whole number")
      return
    }

    setSaving(true)
    try {
      const bookPayload = {
        name,
        year,
        is_active: form.is_active,
        is_pinned: form.is_pinned,
        requires_details: form.requires_details,
      }
      const response = editingBookId
        ? await API.put(`/admin/books/${editingBookId}`, bookPayload)
        : await API.post("/admin/books", bookPayload)
      const bookId = response.data.id

      await Promise.all(options.map((option) => {
        const optionPayload = {
          mode: option.mode,
          print_type: option.print_type,
          price: option.price,
          max_copies: option.max_copies,
        }
        return option.id
          ? API.put(`/admin/book-options/${option.id}`, optionPayload)
          : API.post("/admin/book-options", { book_id: bookId, ...optionPayload })
      }))

      await Promise.all(removedOptionIds.map((optionId) => API.delete(`/admin/book-options/${optionId}`)))
      await onRefresh(true)
      toast.success(editingBookId ? "Book updated" : "Book added")
      resetForm()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to save book"))
    } finally {
      setSaving(false)
    }
  }

  const deleteBook = async (book) => {
    if (deletingId) return

    setDeletingId(book.id)
    try {
      const response = await API.delete(`/admin/books/${book.id}`)
      await onRefresh(true)
      if (editingBookId === book.id) resetForm()
      toast.success(response.data.archived ? "Book archived because it has order history" : "Book deleted")
      setDeleteCandidate(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete book"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.6fr)]">
      <form onSubmit={saveBook} className="self-start rounded-2xl border border-white/10 bg-white/5 p-5 lg:sticky lg:top-24">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400">Book Catalogue</p>
            <h2 className="mt-1 text-lg font-black text-white">{editingBookId ? "Edit book" : "Add book"}</h2>
          </div>
          {editingBookId && (
            <button
              type="button"
              onClick={resetForm}
              aria-label="Cancel editing book"
              className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Book name"
            maxLength={120}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-yellow-400/60"
          />
          <input
            value={form.year}
            onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
            placeholder="Year / edition"
            maxLength={20}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-yellow-400/60"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/70 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              className="accent-yellow-400"
            />
            Active
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(event) => setForm((current) => ({ ...current, is_pinned: event.target.checked }))}
              className="accent-yellow-400"
            />
            Pin first
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.requires_details}
              onChange={(event) => setForm((current) => ({ ...current, requires_details: event.target.checked }))}
              className="accent-yellow-400"
            />
            Require leave details
          </label>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">Pricing</p>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, options: [...current.options, createOption()] }))}
              className="inline-flex items-center gap-1 text-xs font-bold text-yellow-400 transition hover:text-yellow-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Add price
            </button>
          </div>

          <div className="space-y-3">
            {form.options.map((option) => (
              <div key={option.draftId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={option.mode}
                    onChange={(event) => updateOption(option.draftId, "mode", event.target.value)}
                    aria-label="Print mode"
                    placeholder="Mode, e.g. a"
                    maxLength={80}
                    className="min-w-0 rounded-lg border border-white/10 bg-[#151515] px-2 py-2 text-xs text-white outline-none"
                  />
                  <select
                    value={option.print_type}
                    onChange={(event) => updateOption(option.draftId, "print_type", event.target.value)}
                    aria-label="Print side"
                    className="rounded-lg border border-white/10 bg-[#151515] px-2 py-2 text-xs text-white outline-none"
                  >
                    <option value="">Standard side</option>
                    <option value="single">Single side</option>
                    <option value="double">Double side</option>
                  </select>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={option.price}
                    onChange={(event) => updateOption(option.draftId, "price", event.target.value)}
                    placeholder="Price"
                    aria-label="Price"
                    className="min-w-0 rounded-lg border border-white/10 bg-[#151515] px-2 py-2 text-xs text-white outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={option.max_copies}
                    onChange={(event) => updateOption(option.draftId, "max_copies", event.target.value)}
                    placeholder="Max copies"
                    aria-label="Maximum copies"
                    className="min-w-0 rounded-lg border border-white/10 bg-[#151515] px-2 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(option)}
                    aria-label="Remove pricing option"
                    className="rounded-lg border border-red-400/20 bg-red-400/10 p-2 text-red-300 transition hover:bg-red-400 hover:text-black"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <LoadingButton
          type="submit"
          loading={saving}
          loadingText="Saving..."
          className="mt-5 w-full rounded-xl bg-yellow-400 px-4 py-3 font-bold text-black hover:bg-yellow-300"
        >
          {editingBookId ? "Save book" : "Add book"}
        </LoadingButton>
      </form>

      <section className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Available catalogue</p>
            <h2 className="mt-1 text-xl font-black text-white">{visibleBooks.length} books</h2>
          </div>
          <button
            type="button"
            onClick={() => onRefresh(true)}
            aria-label="Refresh book catalogue"
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}
          </div>
        ) : visibleBooks.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-white/10 p-14 text-center text-sm text-white/35">
            No books match this catalogue view.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBooks.map((book) => (
              <article key={book.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookOpen className="h-4 w-4 shrink-0 text-yellow-400" />
                      <h3 className="truncate font-bold text-white">{book.name}</h3>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">{book.year}</span>
                      {!book.is_active && <span className="rounded bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-300">ARCHIVED</span>}
                      {book.is_pinned && <span className="rounded bg-yellow-400/10 px-2 py-0.5 text-[10px] font-bold text-yellow-300">PINNED</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(book.options || []).map((option) => (
                        <span key={option.id} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-white/70">
                          {option.mode || "Standard"} / {option.print_type || "Standard"} - Rs {Number(option.price || 0).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(book)}
                      aria-label={`Edit ${book.name}`}
                      className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/75 transition hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {book.is_active && (
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(book)}
                        aria-label={`Delete ${book.name}`}
                        className="rounded-xl border border-red-400/20 bg-red-400/10 p-2.5 text-red-300 transition hover:bg-red-400 hover:text-black"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {deleteCandidate?.id === book.id && (
                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-red-100">Delete this book? Books attached to carts or orders will be archived instead.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(null)}
                        disabled={deletingId === book.id}
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/70"
                      >
                        Cancel
                      </button>
                      <LoadingButton
                        onClick={() => deleteBook(book)}
                        loading={deletingId === book.id}
                        loadingText="Deleting..."
                        className="rounded-lg bg-red-400 px-3 py-2 text-xs font-bold text-black hover:bg-red-300"
                      >
                        Delete
                      </LoadingButton>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default memo(BookCatalogManager)