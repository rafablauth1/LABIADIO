'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded">
        Tentar novamente
      </button>
    </div>
  )
}
