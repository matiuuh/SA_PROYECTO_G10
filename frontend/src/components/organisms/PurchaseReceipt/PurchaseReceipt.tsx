import { useState } from 'react'
import { Download, Check, Copy, Film, Calendar, Clock, CreditCard } from 'lucide-react'
import { Button } from '@/components/atoms'
import type { SubscriptionPlan } from '@/types/subscription'

interface PurchaseReceiptProps {
  plan: SubscriptionPlan
  orderId: string
  orderDate: string
  paymentMethod?: string
  transactionId?: string
}

export function PurchaseReceipt({
  plan,
  orderId,
  orderDate,
  paymentMethod = 'Visa terminada en 4242',
  transactionId,
}: PurchaseReceiptProps) {
  const [copied, setCopied] = useState(false)
  const tax = plan.price * 0.16
  const total = plan.price + tax

  const handleCopyOrderId = async () => {
    await navigator.clipboard.writeText(orderId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative group no-print">
        <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-denim-600)] to-[var(--color-denim-500)] rounded-2xl blur opacity-20 group-hover:opacity-30 transition-all duration-700"></div>

        <div className="relative bg-[#0d1220] border border-white/[0.07] rounded-2xl overflow-visible flex flex-col md:flex-row shadow-2xl ticket-shape">
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-between relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-denim-500)] to-transparent opacity-40"></div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[var(--color-denim-600)]/20 text-[var(--color-denim-400)] rounded-lg flex items-center justify-center border border-[var(--color-denim-500)]/20">
                    <Film size={18} />
                  </div>
                  <span className="font-bold tracking-widest text-xs uppercase text-gray-300">
                    STREAMING PREMIUM
                  </span>
                </div>
                <span className="bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                  CONFIRMADO
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none mb-2">
                    {plan.name}
                  </h2>
                  <p className="text-xs text-[var(--color-denim-400)]">
                    Suscripción mensual • Renovación automática
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2 border-t border-white/[0.07]">
                  <div>
                    <p className="text-[10px] text-[var(--color-denim-500)] font-semibold tracking-wider uppercase">
                      FECHA
                    </p>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Calendar size={14} className="text-[var(--color-denim-400)]" />
                      {orderDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--color-denim-500)] font-semibold tracking-wider uppercase">
                      HORA
                    </p>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Clock size={14} className="text-[var(--color-denim-400)]" />
                      {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-[var(--color-denim-500)] font-semibold tracking-wider uppercase">
                      CÓDIGO DE ORDEN
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-bold text-white tracking-wider">
                        {orderId}
                      </p>
                      <button
                        onClick={handleCopyOrderId}
                        className="text-xs text-[var(--color-denim-500)] hover:text-white transition-colors p-1"
                        title="Copiar código"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-white/[0.07] space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--color-denim-300)] uppercase tracking-wider">
                    Desglose de pago
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-denim-400)]">Suscripción {plan.name}</span>
                      <span className="text-white font-medium">${plan.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-denim-400)]">IVA (16%)</span>
                      <span className="text-white font-medium">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/[0.07] font-semibold">
                      <span className="text-white">Total Pagado</span>
                      <span className="text-[var(--color-denim-400)] text-lg">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-dashed border-white/[0.07] flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#0d1220] border border-white/[0.07] w-10 h-10 rounded-full flex items-center justify-center">
                  <CreditCard size={18} className="text-[var(--color-denim-400)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-denim-500)] font-semibold uppercase">
                    Método de pago
                  </p>
                  <p className="text-xs text-gray-300">{paymentMethod}</p>
                </div>
              </div>
              {transactionId && (
                <div className="text-center sm:text-right">
                  <p className="text-[10px] text-[var(--color-denim-500)] font-semibold uppercase">
                    ID Transacción
                  </p>
                  <p className="text-xs font-mono text-white">{transactionId}</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative w-full md:w-auto flex md:flex-col justify-between items-center overflow-visible px-4 md:px-0 py-0 md:py-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#080c14] border-2 border-white/[0.15] hidden md:block z-20 shadow-lg"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-[#080c14] border-2 border-white/[0.15] hidden md:block z-20 shadow-lg"></div>

            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#080c14] border-2 border-white/[0.15] md:hidden z-20 shadow-lg"></div>
            <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#080c14] border-2 border-white/[0.15] md:hidden z-20 shadow-lg"></div>

            <div className="w-full md:w-[2px] h-[2px] md:h-full border-t-[3px] md:border-t-0 md:border-l-[3px] border-dashed border-white/[0.2]"></div>
          </div>

          <div className="w-full md:w-64 bg-[#0a0e16] p-6 md:p-8 flex flex-col items-center justify-between text-center relative">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--color-denim-500)]/25 to-transparent opacity-30"></div>

            <div className="w-full flex flex-col items-center">
              <span className="text-[10px] text-[var(--color-denim-400)] font-semibold tracking-widest uppercase mb-4">
                Comprobante Digital
              </span>

              <div className="relative bg-white p-3 rounded-2xl shadow-xl shadow-black/60 group/qr hover:scale-105 transition-transform duration-300">
                <div className="w-32 h-32 flex items-center justify-center bg-white relative">
                  <svg className="w-full h-full text-black" viewBox="0 0 100 100">
                    <path
                      fill="currentColor"
                      d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h10 v10 h-10 z M50,40 h10 v10 h-10 z M10,40 h20 v10 h-20 z M40,60 h10 v10 h-10 z M70,40 h10 v10 h-10 z M90,50 h10 v20 h-10 z M60,70 h20 v10 h-20 z M80,80 h20 v20 h-20 z M40,80 h10 v20 h-10 z M50,10 h10 v10 h-10 z M60,20 h10 v10 h-10 z M30,30 h10 v20 h-10 z M40,30 h10 v10 h-10 z M80,30 h10 v10 h-10 z M50,90 h20 v10 h-20 z M0,35 h10 v10 h-10 z M90,35 h10 v10 h-10 z M35,0 h10 v10 h-10 z"
                    />
                  </svg>
                  <div className="absolute w-8 h-8 bg-[#0d1220] rounded-lg border-2 border-white flex items-center justify-center shadow-md">
                    <Film size={14} className="text-[var(--color-denim-400)]" />
                  </div>
                </div>
                <div className="absolute inset-0 border border-[var(--color-denim-500)]/20 rounded-2xl group-hover/qr:border-[var(--color-denim-500)]/50 transition-colors pointer-events-none"></div>
              </div>

              <div className="mt-3 text-xs font-semibold text-[var(--color-success)] flex items-center gap-1.5">
                <Check size={14} />
                Pago Verificado
              </div>
            </div>

            <div className="w-full mt-6 space-y-2">
              <div className="w-full h-8 flex items-center justify-center opacity-85">
                <svg
                  className="w-full h-full text-white"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                >
                  <rect x="0" width="2" height="20" fill="currentColor"></rect>
                  <rect x="4" width="1" height="20" fill="currentColor"></rect>
                  <rect x="7" width="3" height="20" fill="currentColor"></rect>
                  <rect x="12" width="1" height="20" fill="currentColor"></rect>
                  <rect x="15" width="4" height="20" fill="currentColor"></rect>
                  <rect x="21" width="1" height="20" fill="currentColor"></rect>
                  <rect x="24" width="2" height="20" fill="currentColor"></rect>
                  <rect x="28" width="3" height="20" fill="currentColor"></rect>
                  <rect x="33" width="1" height="20" fill="currentColor"></rect>
                  <rect x="36" width="2" height="20" fill="currentColor"></rect>
                  <rect x="40" width="4" height="20" fill="currentColor"></rect>
                  <rect x="46" width="1" height="20" fill="currentColor"></rect>
                  <rect x="49" width="3" height="20" fill="currentColor"></rect>
                  <rect x="54" width="1" height="20" fill="currentColor"></rect>
                  <rect x="57" width="2" height="20" fill="currentColor"></rect>
                  <rect x="61" width="4" height="20" fill="currentColor"></rect>
                  <rect x="67" width="1" height="20" fill="currentColor"></rect>
                  <rect x="70" width="3" height="20" fill="currentColor"></rect>
                  <rect x="75" width="1" height="20" fill="currentColor"></rect>
                  <rect x="78" width="2" height="20" fill="currentColor"></rect>
                  <rect x="82" width="4" height="20" fill="currentColor"></rect>
                  <rect x="88" width="1" height="20" fill="currentColor"></rect>
                  <rect x="91" width="3" height="20" fill="currentColor"></rect>
                  <rect x="96" width="4" height="20" fill="currentColor"></rect>
                </svg>
              </div>
              <p className="text-[9px] font-mono text-[var(--color-denim-500)] tracking-widest uppercase">
                {orderId}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center no-print">
        <Button
          variant="outline"
          onClick={handlePrint}
          className="flex items-center gap-2"
        >
          <Download size={18} />
          Descargar / Imprimir Recibo
        </Button>
      </div>

      <style>{`
        .ticket-shape {
          clip-path: polygon(
            0 20px,
            20px 0,
            calc(100% - 20px) 0,
            100% 20px,
            100% calc(100% - 20px),
            calc(100% - 20px) 100%,
            20px 100%,
            0 calc(100% - 20px)
          );
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .ticket-shape {
            clip-path: none;
          }
        }
      `}</style>
    </div>
  )
}
