// ===========================================
// Field Schema — กำหนด field ของแต่ละร้าน
// ===========================================

export type FieldType = 'text' | 'phone' | 'textarea' | 'number' | 'select'

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  required: boolean
  enabled: boolean
  placeholder?: string
  options?: string[]   // สำหรับ type=select
  min?: number         // สำหรับ type=number
  max?: number
}

export type FieldSchema = {
  fields: FieldDef[]
}

// default schema สำหรับร้านทั่วไป
export const DEFAULT_FIELD_SCHEMA: FieldSchema = {
  fields: [
    { key: 'name',  label: 'ชื่อ',          type: 'text',  required: true, enabled: true, placeholder: 'กรอกชื่อ' },
    { key: 'phone', label: 'เบอร์โทรศัพท์', type: 'phone', required: true, enabled: true, placeholder: '0812345678' },
  ],
}

// preset templates
export const FIELD_PRESETS = {
  nail: {
    fields: [
      { key: 'name',  label: 'ชื่อ',          type: 'text',  required: true, enabled: true, placeholder: 'กรอกชื่อ' },
      { key: 'phone', label: 'เบอร์โทรศัพท์', type: 'phone', required: true, enabled: true, placeholder: '0812345678' },
    ],
  } as FieldSchema,

  shoe_wash: {
    fields: [
      { key: 'name',            label: 'ชื่อ',          type: 'text',     required: true, enabled: true, placeholder: 'กรอกชื่อ' },
      { key: 'phone',           label: 'เบอร์โทรศัพท์',  type: 'phone',    required: true, enabled: true, placeholder: '0812345678' },
      { key: 'pickup_address',  label: 'สถานที่รับ',     type: 'textarea', required: true, enabled: true, placeholder: 'บ้านเลขที่ ซอย ถนน...' },
      { key: 'shoe_count',      label: 'จำนวนรองเท้า',   type: 'number',   required: true, enabled: true, placeholder: '1', min: 1, max: 99 },
    ],
  } as FieldSchema,
}

// fields ที่เป็นมาตรฐาน — system fields (ลบไม่ได้)
export const SYSTEM_FIELD_KEYS = ['name', 'phone']

// normalize schema — เผื่อเก่าๆ ที่ไม่มี field default
export function normalizeFieldSchema(raw: any): FieldSchema {
  if (!raw || !Array.isArray(raw.fields)) return DEFAULT_FIELD_SCHEMA
  return raw as FieldSchema
}
