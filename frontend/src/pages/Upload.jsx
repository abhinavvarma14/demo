import { AnimatePresence, motion } from "framer-motion"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDropzone } from "react-dropzone"
import * as pdfjsLib from "pdfjs-dist"
import API from "../api/api"
import toast from "react-hot-toast"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

function Upload() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [pages, setPages] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [printType, setPrintType] = useState("single")
  const [uploadedState, setUploadedState] = useState(false)
  const price = useMemo(() => {
    if (!file || pages <= 0) {
      return 0
    }
    if (printType === "double") {
      return (pages * 1.15) + 62
    }
    return (pages * 1.25) + 65
  }, [file, pages, printType])

  const onDrop = async (acceptedFiles) => {
    const selectedFile = acceptedFiles[0]
    if (!selectedFile) return

    try {
      setFile(selectedFile)
      setPreviewUrl("")
      setPages(0)
      setUploadedState(false)
      const reader = new FileReader()
      reader.onload = async function () {
        try {
          const typedarray = new Uint8Array(this.result)
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise
          setPages(pdf.numPages)

          const firstPage = await pdf.getPage(1)
          const viewport = firstPage.getViewport({ scale: 1 })
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          canvas.width = viewport.width
          canvas.height = viewport.height

          await firstPage.render({
            canvasContext: context,
            viewport,
          }).promise

          setPreviewUrl(canvas.toDataURL("image/png"))
          setUploadedState(true)
        } catch (pdfError) {
          console.log(pdfError)
          setFile(null)
          setPages(0)
          setPreviewUrl("")
          setUploadedState(false)
          toast.error("Unable to read this PDF")
        }
      }
      reader.readAsArrayBuffer(selectedFile)
      toast.success("PDF selected")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Failed to read PDF"))
    }
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "application/pdf": [] },
  })

  const addToCart = async () => {
    if (!isLoggedIn()) {
      toast.error("Please login to continue")
      navigate("/login")
      return
    }

    if (!file || pages === 0) {
      toast.error("Select a PDF first")
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("total_pages", String(pages))
      formData.append("quantity", "1")
      formData.append("print_type", printType)

      const uploadRes = await API.post("/api/uploads/pdf", formData)

      await API.post("/cart/items", {
        item_type: "pdf",
        upload_id: uploadRes.data.id,
        stored_filename: uploadRes.data.stored_filename,
        total_pages: uploadRes.data.total_pages,
        print_type: printType,
        quantity: 1,
      })

      toast.success("PDF added to cart")
      navigate("/cart")
    } catch (error) {
      console.log(error)
      toast.error(getApiErrorMessage(error, "Upload failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pt-28 px-4 pb-24">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">
        Upload PDF
      </h1>

      <div
        {...getRootProps()}
        className="border border-dashed border-yellow-400/40 rounded-2xl p-10 text-center bg-white/5 backdrop-blur-md cursor-pointer hover:border-yellow-400 transition"
      >
        <input {...getInputProps()} />

        <p className="text-gray-300">
          Drag & Drop PDF here
        </p>

        <p className="text-gray-500 text-sm mt-2">
          or click to select file
        </p>
      </div>

      {file && (
        <AnimatePresence mode="wait">
          <motion.div
            key={uploadedState ? "uploaded" : "selected"}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className={`mt-3 rounded-2xl px-4 py-3 text-sm ${
              uploadedState
                ? "bg-yellow-400/10 text-yellow-300"
                : "bg-white/5 text-gray-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">
                {file.name}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                uploadedState ? "bg-yellow-400 text-black" : "bg-white/10 text-white/60"
              }`}>
                {uploadedState ? "Uploaded" : "Preparing"}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {previewUrl && (
        <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-3">
          <p className="text-gray-400 text-sm mb-3">
            Preview
          </p>
          <img
            src={previewUrl}
            alt="PDF preview"
            className="w-full rounded-xl border border-white/10"
          />
        </div>
      )}

      {pages > 0 && (
        <p className="mt-4 text-gray-300">
          Pages detected: {pages}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-gray-400">
          Print Side
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => setPrintType("single")}
            type="button"
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              printType === "single"
                ? "bg-yellow-400 text-black"
                : "bg-white/5 text-white border border-white/10"
            }`}
          >
            Single Side
          </button>

          <button
            onClick={() => setPrintType("double")}
            type="button"
            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
              printType === "double"
                ? "bg-yellow-400 text-black"
                : "bg-white/5 text-white border border-white/10"
            }`}
          >
            Double Side
          </button>
        </div>
      </div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-gray-400 text-sm">
          Total Price
        </p>

        <p className="text-2xl font-bold text-yellow-400">
          ₹{price.toFixed(2)}
        </p>
      </div>

      <button
        onClick={addToCart}
        disabled={submitting}
        className="mt-6 w-full py-3 rounded-xl font-semibold transition bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-60"
      >
        {submitting ? "Adding..." : "Add To Cart"}
      </button>
    </div>
  )

}

export default Upload
