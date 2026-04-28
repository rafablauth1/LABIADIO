export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <a href="/dashboard" className="text-blue-600 underline">Voltar ao dashboard</a>
    </div>
  )
}
