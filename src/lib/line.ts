// ==============================================
// LINE Messaging API — per-shop credentials
// ==============================================

import crypto from 'crypto'

type LineCredentials = {
  accessToken: string
  channelSecret: string
  adminGroupId: string | null
  liffId: string | null
}

export async function getShopLineCredentials(shopId: string): Promise<LineCredentials> {
  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()
  const { data: shop } = await supabase
    .from('shops')
    .select('line_access_token, line_channel_secret, line_admin_group_id, line_liff_id')
    .eq('id', shopId)
    .single()
  return {
    accessToken:   shop?.line_access_token   ?? process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
    channelSecret: shop?.line_channel_secret  ?? process.env.LINE_CHANNEL_SECRET       ?? '',
    adminGroupId:  shop?.line_admin_group_id  ?? process.env.LINE_ADMIN_GROUP_ID       ?? null,
    liffId:        shop?.line_liff_id         ?? process.env.NEXT_PUBLIC_LIFF_ID       ?? null,
  }
}

export async function pushMessage(to: string, messages: object[], accessToken: string) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  })
  if (!res.ok) console.error('LINE push error:', await res.json())
  return res.ok
}

// ==============================================
// Admin token-based access (signed JWT-lite)
// ==============================================
// สร้าง token ฝัง booking_id + expiry
// ป้องกัน admin link ใช้ซ้ำได้ตลอด

function signAdminToken(payload: { bookingId?: string; exp: number }): string {
  const secret = process.env.ADMIN_SECRET_KEY ?? ''
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig  = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyAdminToken(token: string): { bookingId?: string; exp: number } | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const secret = process.env.ADMIN_SECRET_KEY ?? ''
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

// ผูก URL กับ token ชั่วคราว (30 นาที)
function adminUrl(bookingId?: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const exp  = Date.now() + 30 * 60 * 1000   // 30 นาที
  const token = signAdminToken({ bookingId, exp })
  return `${base}/admin?token=${token}`
}

// ==============================================
// Flex Message Templates — Compact (kilo size)
// ==============================================

// ✅ Compact row — ใช้ font sm + padding น้อย
function compactRow(label: string, value: string) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, color: '#8E8E93', size: 'xs', flex: 2 },
      { type: 'text', text: value, color: '#1C1C1E', size: 'xs', weight: 'bold', flex: 4, align: 'end', wrap: true },
    ],
  }
}

// แจ้ง admin group — มีจองใหม่
export function buildAdminNotifyFlex(data: {
  customerName: string
  phone: string
  serviceName: string
  branchName: string
  date: string
  time: string
  price: number
  bookingId: string
  lineUserId?: string | null
  details?: Array<{ label: string; value: string }>
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  const bodyContents: any[] = [
    compactRow('บริการ', data.serviceName),
    compactRow('สาขา', data.branchName),
    compactRow('วันที่', `${dateLabel} · ${data.time} น.`),
    compactRow('เบอร์', data.phone || '-'),
  ]

  // ✅ เพิ่ม booking_details (สถานที่รับ, จำนวนรองเท้า ฯลฯ)
  if (data.details && data.details.length > 0) {
    bodyContents.push({ type: 'separator', margin: 'sm' })
    data.details.forEach(d => bodyContents.push(compactRow(d.label, d.value)))
  }

  const footerButtons: any[] = [
    {
      type: 'button',
      style: 'primary',
      color: '#1C1C1E',
      height: 'sm',
      action: { type: 'uri', label: 'Dashboard', uri: adminUrl(data.bookingId) },
    },
  ]

  if (data.lineUserId) {
    const contactUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/contact?bookingId=${data.bookingId}&token=${encodeURIComponent(signAdminToken({ bookingId: data.bookingId, exp: Date.now() + 30 * 60 * 1000 }))}`
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: { type: 'uri', label: 'ส่งข้อความ', uri: contactUrl },
      margin: 'xs',
    })
  }

  if (data.phone) {
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      height: 'sm',
      action: { type: 'uri', label: `โทร ${data.phone}`, uri: `tel:${data.phone}` },
      margin: 'xs',
    })
  }

  return {
    type: 'flex',
    altText: `จองใหม่ ${data.customerName} ${data.time} น.`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#18181B',
        paddingAll: '10px',
        paddingBottom: '12px',
        contents: [
          { type: 'text', text: 'จองใหม่ — รอยืนยัน', color: '#FBBF24', size: 'xxs', weight: 'bold' },
          { type: 'text', text: data.customerName, color: '#FFFFFF', size: 'md', weight: 'bold', margin: 'xs' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '10px', spacing: 'xs',
        contents: bodyContents,
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '8px', spacing: 'xs',
        contents: footerButtons,
      },
    },
  }
}

// แจ้งลูกค้า — รอยืนยัน
export function buildBookingPendingFlex(data: {
  customerName: string
  serviceName: string
  branchName: string
  date: string
  time: string
  price: number
  details?: Array<{ label: string; value: string }>
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const bodyContents: any[] = [
    compactRow('บริการ', data.serviceName),
    compactRow('สาขา', data.branchName),
    compactRow('วันที่', dateLabel),
    compactRow('เวลา', `${data.time} น.`),
  ]
  if (data.details && data.details.length > 0) {
    bodyContents.push({ type: 'separator', margin: 'sm' })
    data.details.forEach(d => bodyContents.push(compactRow(d.label, d.value)))
  }

  return {
    type: 'flex',
    altText: `คำขอจอง ${data.serviceName} ${dateLabel}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#18181B',
        paddingAll: '12px',
        contents: [
          { type: 'text', text: 'รอการยืนยัน', color: '#FBBF24', size: 'xxs', weight: 'bold' },
          { type: 'text', text: 'ส่งคำขอจองสำเร็จ', color: '#FFFFFF', size: 'md', weight: 'bold', margin: 'xs' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '10px', spacing: 'xs',
        contents: bodyContents,
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '10px',
        backgroundColor: '#FEFCE8',
        contents: [
          { type: 'text', text: 'ร้านจะแจ้งผลยืนยันให้ทราบโดยเร็ว', color: '#92400E', size: 'xxs', align: 'center' },
        ],
      },
    },
  }
}

// แจ้งลูกค้า — confirmed แล้ว
// ✅ บนสุด: ยืนยันการจอง / ถัดมา: นัดหมายได้รับการยืนยันแล้ว
export function buildBookingConfirmedFlex(data: {
  serviceName: string
  branchName: string
  date: string
  time: string
  price: number
  details?: Array<{ label: string; value: string }>
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const bodyContents: any[] = [
    compactRow('บริการ', data.serviceName),
    compactRow('สาขา', data.branchName),
    compactRow('วันที่', dateLabel),
    compactRow('เวลา', `${data.time} น.`),
  ]
  if (data.details && data.details.length > 0) {
    bodyContents.push({ type: 'separator', margin: 'sm' })
    data.details.forEach(d => bodyContents.push(compactRow(d.label, d.value)))
  }

  return {
    type: 'flex',
    altText: `ยืนยันการจอง ${data.serviceName}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#052E16',
        paddingAll: '12px',
        contents: [
          // ✅ บนสุด: ยืนยันการจอง
          { type: 'text', text: 'ยืนยันการจอง', color: '#4ADE80', size: 'xxs', weight: 'bold' },
          // ✅ ถัดมา: นัดหมายได้รับการยืนยันแล้ว
          { type: 'text', text: 'นัดหมายได้รับการยืนยันแล้ว', color: '#FFFFFF', size: 'md', weight: 'bold', margin: 'xs', wrap: true },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '10px', spacing: 'xs',
        contents: bodyContents,
      },
    },
  }
}

// reminder ก่อนนัด
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
    altText: `แจ้งเตือนนัด พรุ่งนี้ ${data.time} น.`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#0C4A6E',
        paddingAll: '12px',
        contents: [
          { type: 'text', text: 'แจ้งเตือนนัดหมาย', color: '#7DD3FC', size: 'xxs', weight: 'bold' },
          { type: 'text', text: `พรุ่งนี้ ${data.time} น.`, color: '#FFFFFF', size: 'md', weight: 'bold', margin: 'xs' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '10px', spacing: 'xs',
        contents: [
          { type: 'text', text: `สวัสดี ${data.customerName}`, size: 'sm', weight: 'bold', color: '#1C1C1E' },
          { type: 'separator', margin: 'sm' },
          compactRow('บริการ', data.serviceName),
          compactRow('สาขา', data.branchName),
          compactRow('วันที่', dateLabel),
          compactRow('เวลา', `${data.time} น.`),
          ...(data.branchAddress ? [compactRow('ที่อยู่', data.branchAddress)] : []),
        ],
      },
    },
  }
}
