import { memo } from "react"
import { Truck } from "lucide-react"
import LoadingButton from "./LoadingButton"

function DeliveryQueue({
  orders = [],
  actionLoading = "",
  getLoadingKey = (order) => String(order.id),
  onMarkDelivered,
  emptyMessage = "No orders ready for delivery",
}) {
  if (!orders.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-white/5 p-20 text-center text-white/25">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {orders.map((order) => {
        const loadingKey = getLoadingKey(order)
        const isLoading = actionLoading === loadingKey
        const customerName = order.user_name || order.user?.username || "-"
        const location = order.hostel || order.hostel_name || "-"

        return (
          <div
            key={order.id}
            className="premium-card rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20"
          >
            <div className="flex flex-col justify-between gap-6 md:flex-row">
              <div className="min-w-0 flex-1">
                <div className="mb-4 flex items-center gap-3">
                  <span className="rounded bg-green-400/10 px-2 py-1 text-xs font-bold text-green-400">
                    READY FOR DELIVERY
                  </span>
                  <span className="text-xs font-bold text-white/40">
                    {order.batch_id || "Direct Delivery"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="mb-1 text-[10px] uppercase text-white/30">Customer</p>
                    <p className="font-bold text-white">{customerName}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] uppercase text-white/30">Location</p>
                    <p className="text-sm text-white/70">{location} | {order.delivery_type || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] uppercase text-white/30">Contact</p>
                    <p className="text-sm text-white/70">{order.contact_number || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] uppercase text-white/30">Items</p>
                    <div className="thin-scrollbar max-h-16 overflow-y-auto text-xs text-white/50">
                      {(order.items || []).map((item, index) => (
                        <div key={item.id || `${order.id}-${index}`}>
                          {item.item_name} x{item.quantity || 1} | {item.item_type || "Book"} | {item.mode || "-"} / {item.print_type || "-"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <LoadingButton
                  onClick={() => onMarkDelivered(order)}
                  loading={isLoading}
                  loadingText="Updating..."
                  disabled={Boolean(actionLoading)}
                  className="w-full rounded-xl bg-green-500 px-8 py-3 font-bold text-black hover:bg-green-400 md:w-auto"
                >
                  <Truck className="h-4 w-4" />
                  Mark Delivered
                </LoadingButton>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default memo(DeliveryQueue)