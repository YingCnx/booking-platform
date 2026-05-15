import Link from 'next/link'

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-xl font-bold text-white">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
          กรุณาเข้าผ่านลิงก์ในกลุ่ม LINE Admin ของร้าน
          <br />หรือ login ผ่าน LINE
        </p>
        <Link
          href="/liff?next=/admin"
          className="mt-6 inline-block bg-white text-black font-semibold px-6 py-3 rounded-2xl text-sm"
        >
          Login ผ่าน LINE
        </Link>
        <p className="text-zinc-600 text-xs mt-6">
          เฉพาะแอดมินที่ได้รับสิทธิ์เท่านั้น
        </p>
      </div>
    </main>
  )
}
