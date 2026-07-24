function Contact() {
  return (
    <div className="pt-24 px-4 pb-32">
      <h1 className="text-2xl font-bold text-yellow-400 mb-4">
        📞 Contact
      </h1>

      <div className="max-w-3xl space-y-4 text-gray-300">
        <p>
          For any queries, support requests, or concerns, you may contact us at:
        </p>

        <div className="space-y-2">
          <p>
            <span className="font-semibold text-white">Brand Name:</span>{" "}
            BatPrint
          </p>
          <p>
            <span className="font-semibold text-white">Email:</span>{" "}
            batprint6@gmail.com
          </p>
          <p>
            <span className="font-semibold text-white">Phone:</span>{" "}
            <a className="hover:text-yellow-400 transition" href="tel:9966030017">
              9966030017
            </a>
          </p>
        </div>

        <p>We strive to respond to all inquiries within 24–48 business hours.</p>
      </div>
    </div>
  )
}

export default Contact
