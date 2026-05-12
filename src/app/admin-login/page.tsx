export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-xl font-bold text-white">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
          กรุณาใช้ลิงค์จาก LINE Group admin
          <br />เพื่อเข้าสู่หน้าจัดการ
        </p>
      </div>
    </main>
  )
}
