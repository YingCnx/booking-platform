import CloseButton from './CloseButton'

type Props = {
  searchParams: Promise<{ pending?: string }>
}

export default async function SuccessPage({ searchParams }: Props) {

  const { pending } = await searchParams
  const isPending = pending === 'true'

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">

      <div className="w-full max-w-sm">

        <div className="text-6xl mb-6">
          {isPending ? '⏳' : '🎉'}
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          {isPending ? 'ส่งคำขอสำเร็จ!' : 'จองสำเร็จแล้ว!'}
        </h1>

        <p className="mt-3 text-gray-500 leading-relaxed whitespace-pre-line">
          {isPending
            ? 'เราได้รับคำขอจองของคุณแล้ว\nกรุณารอการยืนยันจากร้านสักครู่'
            : 'การจองได้รับการยืนยันแล้ว'}
        </p>

        {isPending && (
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-600 text-left space-y-2">

            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>ระบบได้รับคำขอของคุณแล้ว</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400">○</span>
              <span>รอร้านยืนยันการจอง</span>
            </div>

          </div>
        )}

        <CloseButton />

      </div>

    </main>
  )
}