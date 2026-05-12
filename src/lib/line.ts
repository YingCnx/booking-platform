// ==============================================
// LINE Messaging API utilities
// ==============================================

const LINE_API = 'https://api.line.me/v2/bot'

// ส่งข้อความหา user คนเดียว
export async function pushMessage(to: string, messages: object[]) {
  const res = await fetch(`${LINE_API}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages }),
  })
  if (!res.ok) {
    const err = await res.json()
    console.error('LINE push error:', err)
  }
  return res.ok
}

// ส่ง reply (ใช้ replyToken จาก webhook)
export async function replyMessage(replyToken: string, messages: object[]) {
  const res = await fetch(`${LINE_API}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
  if (!res.ok) {
    const err = await res.json()
    console.error('LINE reply error:', err)
  }
  return res.ok
}

// ==============================================
// Flex Message Templates
// ==============================================

// ส่งให้ลูกค้า — แจ้งว่าจองสำเร็จ รอยืนยัน
export function buildBookingPendingFlex(data: {
  customerName: string
  serviceName: string
  branchName: string
  date: string
  time: string
  price: number
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return {
    type: 'flex',
    altText: `📋 คำขอจอง ${data.serviceName} วันที่ ${dateLabel}`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#18181b',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '⏳ รอการยืนยัน', color: '#fbbf24', size: 'sm', weight: 'bold' },
          { type: 'text', text: 'ส่งคำขอจองสำเร็จ', color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        spacing: 'md',
        contents: [
          infoRow('บริการ', data.serviceName),
          infoRow('สาขา', data.branchName),
          infoRow('วันที่', dateLabel),
          infoRow('เวลา', `${data.time} น.`),
          { type: 'separator', margin: 'md' },
          {
            type: 'box', layout: 'horizontal', margin: 'md',
            contents: [
              { type: 'text', text: 'ราคา', color: '#71717a', size: 'sm', flex: 1 },
              { type: 'text', text: `฿${data.price}`, color: '#18181b', size: 'xl', weight: 'bold', align: 'end' },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        backgroundColor: '#fefce8',
        contents: [
          {
            type: 'text',
            text: 'ร้านจะแจ้งผลยืนยันให้ทราบโดยเร็ว',
            color: '#92400e', size: 'sm', align: 'center',
          },
        ],
      },
    },
  }
}

// ส่งให้ลูกค้า — ร้าน confirm แล้ว
export function buildBookingConfirmedFlex(data: {
  serviceName: string
  branchName: string
  date: string
  time: string
  price: number
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return {
    type: 'flex',
    altText: `✅ ยืนยันการจอง ${data.serviceName}`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#052e16',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '✅ ยืนยันการจองแล้ว', color: '#4ade80', size: 'sm', weight: 'bold' },
          { type: 'text', text: 'พบกันในวันนัด!', color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        spacing: 'md',
        contents: [
          infoRow('บริการ', data.serviceName),
          infoRow('สาขา', data.branchName),
          infoRow('วันที่', dateLabel),
          infoRow('เวลา', `${data.time} น.`),
          { type: 'separator', margin: 'md' },
          {
            type: 'box', layout: 'horizontal', margin: 'md',
            contents: [
              { type: 'text', text: 'ราคา', color: '#71717a', size: 'sm', flex: 1 },
              { type: 'text', text: `฿${data.price}`, color: '#18181b', size: 'xl', weight: 'bold', align: 'end' },
            ],
          },
        ],
      },
    },
  }
}

// แจ้ง admin ใน LINE OA — มีจองใหม่
export function buildAdminNotifyFlex(data: {
  customerName: string
  phone: string
  serviceName: string
  branchName: string
  date: string
  time: string
  price: number
  bookingId: string
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  return {
    type: 'flex',
    altText: `🔔 จองใหม่! ${data.customerName} — ${data.serviceName}`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1e1b4b',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: '🔔 มีการจองใหม่', color: '#a5b4fc', size: 'sm' },
          { type: 'text', text: data.customerName, color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'sm',
        contents: [
          infoRow('บริการ', data.serviceName),
          infoRow('สาขา', data.branchName),
          infoRow('วันที่', `${dateLabel} · ${data.time} น.`),
          infoRow('เบอร์', data.phone || '-'),
          { type: 'separator', margin: 'md' },
          {
            type: 'box', layout: 'horizontal', margin: 'md',
            contents: [
              { type: 'text', text: 'ราคา', color: '#71717a', size: 'sm', flex: 1 },
              { type: 'text', text: `฿${data.price}`, color: '#18181b', size: 'lg', weight: 'bold', align: 'end' },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#18181b',
            action: {
              type: 'uri',
              label: 'เปิด Admin จัดการ',
              uri: `${process.env.NEXT_PUBLIC_SITE_URL}/admin`,
            },
          },
        ],
      },
    },
  }
}

// reminder แจ้งเตือนก่อนนัด
export function buildReminderFlex(data: {
  customerName: string
  serviceName: string
  branchName: string
  branchAddress?: string
  date: string
  time: string
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return {
    type: 'flex',
    altText: `⏰ แจ้งเตือนนัด ${data.serviceName} พรุ่งนี้ ${data.time} น.`,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0c4a6e',
        paddingAll: '20px',
        contents: [
          { type: 'text', text: '⏰ แจ้งเตือนนัดหมาย', color: '#7dd3fc', size: 'sm', weight: 'bold' },
          { type: 'text', text: `พรุ่งนี้ ${data.time} น.`, color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        spacing: 'md',
        contents: [
          { type: 'text', text: `สวัสดี ${data.customerName}`, size: 'md', weight: 'bold', color: '#18181b' },
          { type: 'text', text: 'ขอแจ้งเตือนนัดหมายของคุณ', size: 'sm', color: '#71717a', margin: 'sm' },
          { type: 'separator', margin: 'lg' },
          infoRow('บริการ', data.serviceName),
          infoRow('สาขา', data.branchName),
          infoRow('วันที่', dateLabel),
          infoRow('เวลา', `${data.time} น.`),
          ...(data.branchAddress ? [infoRow('ที่อยู่', data.branchAddress)] : []),
        ],
      },
    },
  }
}

// helper
function infoRow(label: string, value: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, color: '#71717a', size: 'sm', flex: 2 },
      { type: 'text', text: value, color: '#18181b', size: 'sm', weight: 'bold', flex: 3, align: 'end', wrap: true },
    ],
  }
}
