import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDropzone } from "react-dropzone"
import * as pdfjsLib from "pdfjs-dist"
import API from "../api/api"
import toast from "react-hot-toast"
import { isLoggedIn } from "../utils/auth"
import { getApiErrorMessage } from "../utils/apiError"

function Upload() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState("")
  const [pages, setPages] = useState(0)
  const [copies, setCopies] = useState(1)
  const [mode, setMode] = useState("black_white")
  const [printType, setPrintType] = useState("single")
  const [price, setPrice] = useState(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onDrop = async (acceptedFiles) => {
    const selectedFile = acceptedFiles[0]
    if (!selectedFile) return

    try {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = async function () {
        const typedarray = new Uint8Array(this.result)
        const pdf = await pdfjsLib.getDocument(typedarray).promise
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

  useEffect(() => {
    const fetchPrice = async () => {
      if (!file || pages === 0) {
        setPrice(0)
        return
      }

      try {
        setLoadingPrice(true)
        const res = await API.get("/pricing/pdf", {
          params: {
            total_pages: pages,
            copies,
            mode,
            print_type: printType,
          },
        })
        setPrice(res.data.total_price)
      } catch (error) {
        console.log(error)
        setPrice(0)
      } finally {
        setLoadingPrice(false)
      }
    }

    fetchPrice()
  }, [copies, file, mode, pages, printType])

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
      formData.append("mode", mode)
      formData.append("print_type", printType)
      formData.append("quantity", String(copies))

      const uploadRes = await API.post("/uploads/pdf", formData)

      await API.post("/cart/items", {
        item_type: "pdf",
        upload_id: uploadRes.data.id,
        stored_filename: uploadRes.data.stored_filename,
        total_pages: uploadRes.data.total_pages,
        mode: uploadRes.data.mode,
        print_type: uploadRes.data.print_type,
        quantity: uploadRes.data.quantity,
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
        <p className="mt-3 text-gray-400 text-sm">
          Selected: {file.name}
        </p>
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

      <div className="mt-6">
        <p className="text-gray-400 mb-2">
          Mode
        </p>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
        >
          <option value="black_white">
            Black & White
          </option>
          <option value="color">
            Color
          </option>
        </select>
      </div>

      <div className="mt-4">
        <p className="text-gray-400 mb-2">
          Print Type
        </p>

        <select
          value={printType}
          onChange={(e) => setPrintType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
        >
          <option value="single">
            Single Side
          </option>
          <option value="double">
            Double Side
          </option>
        </select>
      </div>

      <div className="mt-4">
        <p className="text-gray-400 mb-2">
          Copies
        </p>

        <input
          type="number"
          min="1"
          value={copies}
          onChange={(e) => setCopies(Number(e.target.value))}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3"
        />
      </div>

      <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-gray-400 text-sm">
          Total Price
        </p>

        <p className="text-2xl font-bold text-yellow-400">
          {loadingPrice ? "Calculating..." : `₹${price}`}
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
