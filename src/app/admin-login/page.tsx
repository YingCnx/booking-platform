export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-xl font-bold text-white">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
          กรุณาเข้าผ่านลิงก์ในกลุ่ม LINE Admin
          <br />ลิงก์มีอายุ 30 นาที
        </p>
        <p className="text-zinc-600 text-xs mt-6">
          หากต้องการเข้า Dashboard กรุณาให้ระบบส่งคำขอจองใหม่
          <br />หรือติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </main>
  )
}
