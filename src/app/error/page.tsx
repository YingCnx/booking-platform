type Props = {
  searchParams: Promise<{ message?: string }>
}

export default async function ErrorPage({ searchParams }: Props) {
  const { message } = await searchParams

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm">

        <div className="text-6xl mb-6">😕</div>

        <h1 className="text-2xl font-bold text-gray-900">เกิดข้อผิดพลาด</h1>

        <p className="mt-3 text-gray-500 text-sm">
          {message ? decodeURIComponent(message) : 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง'}
        </p>

        <a href="/"
          className="mt-8 block w-full bg-gray-900 text-white font-semibold py-4 rounded-2xl text-base active:bg-gray-700 transition">
          กลับหน้าแรก
        </a>

      </div>
    </main>
  )
}
