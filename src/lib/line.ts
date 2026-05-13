// ==============================================
// LINE Messaging API — per-shop credentials
// ==============================================

// ดึง LINE credentials ของร้านนั้นๆ จาก DB
// ถ้าไม่มีใน DB ถอย fallback ไป env
type LineCredentials = {
  accessToken: string
  channelSecret: string
  adminGroupId: string | null
  liffId: string | null
}

export async function getShopLineCredentials(shopId: string): Promise<LineCredentials> {
  // dynamic import เพื่อหลีกเลี่ยง circular dependency
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

// ส่งข้อความโดยใช้ credentials ของร้านนั้น
export async function pushMessage(
  to: string,
  messages: object[],
  accessToken: string
) {
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

function adminUrl(path = '') {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const key  = process.env.ADMIN_SECRET_KEY ?? ''
  return `${base}/admin${path}?key=${key}`
}

// ==============================================
// Flex Message Templates
// ==============================================

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
}) {
  const dateLabel = new Date(data.date).toLocaleDateString('th-TH', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  // ✅ ปุ่ม footer — มีให้ทั้ง quick message + tel
  const footerButtons: any[] = [
    {
      type: 'button',
      style: 'primary',
      color: '#18181b',
      action: { type: 'uri', label: '✓ เปิด Dashboard ยืนยัน', uri: adminUrl() },
    },
  ]

  // ปุ่มส่งข้อความหาลูกค้าทาง LINE (ใช้ Push Message API)
  if (data.lineUserId) {
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      action: {
        type: 'uri',
        label: '💬 ส่งข้อความหาลูกค้า',
        uri: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/contact?bookingId=${data.bookingId}&key=${process.env.ADMIN_SECRET_KEY ?? ''}`,
      },
      margin: 'sm',
    })
  }

  // ปุ่มโทรหาลูกค้า
  if (data.phone) {
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      action: {
        type: 'uri',
        label: `📞 โทรหา ${data.phone}`,
        uri: `tel:${data.phone}`,
      },
      margin: 'sm',
    })
  }

  return {
    type: 'flex',
    altText: `🔔 จองใหม่! ${data.customerName} — ${data.serviceName} ${data.time} น.`,
    contents: {
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#1e1b4b', paddingAll: '16px',
        contents: [
          { type: 'text', text: '🔔 มีการจองใหม่ — รอยืนยัน', color: '#a5b4fc', size: 'sm', weight: 'bold' },
          { type: 'text', text: data.customerName, color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'sm',
        contents: [
          infoRow('บริการ', data.serviceName),
          infoRow('สาขา', data.branchName),
          infoRow('วันที่', `${dateLabel} เวลา ${data.time} น.`),
          infoRow('เบอร์', data.phone || '-'),
          { type: 'separator', margin: 'md' },
          { type: 'box', layout: 'horizontal', margin: 'md',
            contents: [
              { type: 'text', text: 'ราคา', color: '#71717a', size: 'sm', flex: 1 },
              { type: 'text', text: `฿${data.price}`, color: '#18181b', size: 'xl', weight: 'bold', align: 'end' },
            ],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '12px',
        contents: footerButtons,
      },
    },
  }
}

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
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#18181b', paddingAll: '20px',
        contents: [
          { type: 'text', text: '⏳ รอการยืนยัน', color: '#fbbf24', size: 'sm', weight: 'bold' },
          { type: 'text', text: 'ส่งคำขอจองสำเร็จ', color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '20px', spacing: 'md',
        contents: [
          infoRow('บริการ', data.serviceName),
          infoRow('สาขา', data.branchName),
          infoRow('วันที่', dateLabel),
          infoRow('เวลา', `${data.time} น.`),
          { type: 'separator', margin: 'md' },
          { type: 'box', layout: 'horizontal', margin: 'md',
            contents: [
              { type: 'text', text: 'ราคา', color: '#71717a', size: 'sm', flex: 1 },
              { type: 'text', text: `฿${data.price}`, color: '#18181b', size: 'xl', weight: 'bold', align: 'end' },
            ],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '16px', backgroundColor: '#fefce8',
        contents: [{ type: 'text', text: 'ร้านจะแจ้งผลยืนยันให้ทราบโดยเร็ว', color: '#92400e', size: 'sm', align: 'center' }],
      },
    },
  }
}

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
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#052e16', paddingAll: '20px',
        contents: [
          { type: 'text', text: '✅ ยืนยันการจองแล้ว', color: '#4ade80', size: 'sm', weight: 'bold' },
          { type: 'text', text: 'พบกันในวันนัด!', color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '20px', spacing: 'md',
        contents: [
          infoRow('บริการ', data.serviceName),
          infoRow('สาขา', data.branchName),
          infoRow('วันที่', dateLabel),
          infoRow('เวลา', `${data.time} น.`),
          { type: 'separator', margin: 'md' },
          { type: 'box', layout: 'horizontal', margin: 'md',
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
      type: 'bubble', size: 'giga',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#0c4a6e', paddingAll: '20px',
        contents: [
          { type: 'text', text: '⏰ แจ้งเตือนนัดหมาย', color: '#7dd3fc', size: 'sm', weight: 'bold' },
          { type: 'text', text: `พรุ่งนี้ ${data.time} น.`, color: '#ffffff', size: 'xl', weight: 'bold', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '20px', spacing: 'md',
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

function infoRow(label: string, value: string) {
  return {
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: label, color: '#71717a', size: 'sm', flex: 2 },
      { type: 'text', text: value, color: '#18181b', size: 'sm', weight: 'bold', flex: 3, align: 'end', wrap: true },
    ],
  }
}
