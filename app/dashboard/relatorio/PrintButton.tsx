'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary text-xs print:hidden"
    >
      <Printer size={13} />
      Imprimir / PDF
    </button>
  )
}
