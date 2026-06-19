import type {
  HistoryEntity,
  HistoryFulfillmentKind,
  HistoryOrder,
  HistoryOrderLine,
} from '../types/shortage'
import { buildDemoHistoryScrollOrders } from './infiniteScrollDemo'

function addDays(base: Date, days: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const CITY_HOTELS: {
  city: string
  hotels: { name: string; address: string; entity: HistoryEntity }[]
}[] = [
  {
    city: '北京',
    hotels: [
      { name: '北京香格里拉饭店', address: '北京市朝阳区建国门外大街1号', entity: '丰厨供应链' },
      { name: '北京饭店', address: '北京市东城区东长安街33号', entity: '益海嘉里德立安' },
      { name: '王府井希尔顿酒店', address: '北京市东城区王府井东街8号', entity: '丰厨供应链' },
    ],
  },
  {
    city: '上海',
    hotels: [
      { name: '上海浦东香格里拉', address: '上海市浦东新区富城路33号', entity: '益海嘉里德立安' },
      { name: '上海和平饭店', address: '上海市黄浦区南京东路20号', entity: '丰厨供应链' },
      { name: '静安瑞吉酒店', address: '上海市静安区北京西路1008号', entity: '益海嘉里德立安' },
    ],
  },
  {
    city: '广州',
    hotels: [
      { name: '广州白天鹅宾馆', address: '广州市荔湾区沙面南街1号', entity: '丰厨供应链' },
      { name: '广州花园酒店', address: '广州市越秀区环市东路368号', entity: '益海嘉里德立安' },
    ],
  },
  {
    city: '成都',
    hotels: [
      { name: '成都富力丽思卡尔顿', address: '成都市青羊区顺城大街269号', entity: '益海嘉里德立安' },
      { name: '成都香格里拉大酒店', address: '成都市锦江区滨江东路9号', entity: '丰厨供应链' },
    ],
  },
]

const PRODUCTS: { sku: string; productName: string; spec: string; unit: string }[] = [
  { sku: 'JLY-5L-001', productName: '金龙鱼食用调和油', spec: '5L/桶', unit: '桶' },
  { sku: 'JLY-1L-002', productName: '金龙鱼葵花籽油', spec: '1.8L/瓶', unit: '瓶' },
  { sku: 'JLY-10KG-003', productName: '金龙鱼大米', spec: '10kg/袋', unit: '袋' },
  { sku: 'JLY-900-004', productName: '金龙鱼花生油', spec: '900ml/瓶', unit: '瓶' },
  { sku: 'JLY-5KG-005', productName: '金龙鱼面粉', spec: '5kg/袋', unit: '袋' },
]

const KINDS: HistoryFulfillmentKind[] = ['urgent', 'defer']

const SUPPLIERS: string[] = [
  '益海嘉里粮油（上海）有限公司',
  '丰益贸易（深圳）有限公司',
  '金龙鱼华东配送中心',
  '中粮粮油华南分公司',
  '嘉吉投资（中国）供应链',
]

function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(rand(seed) * arr.length) % arr.length]
}

export const MOCK_SALES_HISTORY_ORDERS: HistoryOrder[] = (() => {
  const today = new Date()
  const out: HistoryOrder[] = []
  let counter = 0

  // 过去约 60 天，每隔 1~2 天生成 1~2 单
  for (let dayOffset = 2; dayOffset <= 60; dayOffset += 1) {
    const ordersToday = rand(dayOffset * 7.7) > 0.55 ? 2 : rand(dayOffset * 3.1) > 0.4 ? 1 : 0
    for (let k = 0; k < ordersToday; k++) {
      counter += 1
      const cityBlock = pick(CITY_HOTELS, counter * 1.3)
      const hotel = pick(cityBlock.hotels, counter * 2.1)
      const deliveryDate = addDays(today, -dayOffset)
      const lineNum = 1 + Math.floor(rand(counter * 5.5) * 3) // 1~3 个品

      const lines: HistoryOrderLine[] = []
      for (let i = 0; i < lineNum; i++) {
        const product = pick(PRODUCTS, counter * 9.3 + i * 2.7)
        const kind = pick(KINDS, counter * 4.4 + i * 1.9)
        // 越久远的订单越可能已签收；延期单部分未签收
        const signedSeed = rand(counter * 6.6 + i * 3.3 + dayOffset * 0.2)
        const signed = kind === 'defer' ? signedSeed > 0.5 : signedSeed > 0.12
        // 同一酒店下不同 SKU 的收货日期各不相同：
        // 已签收 → 实际收货日期（原收货日期基础上 0~3 天波动，不晚于今天）
        // 未签收 → 预计收货日期（在原收货日期基础上顺延 1~7 天）
        const dateSeed = rand(counter * 8.8 + i * 2.3 + dayOffset * 0.5)
        const lineDayOffset = signed
          ? Math.min(0, -dayOffset + Math.floor(dateSeed * 4)) // 实际收货日期，不晚于今天
          : -dayOffset + 1 + Math.floor(dateSeed * 7) // 预计收货日期，可能在未来
        const deliveryDate = addDays(today, lineDayOffset)
        lines.push({
          sku: product.sku,
          productName: product.productName,
          spec: product.spec,
          unit: product.unit,
          qty: 10 + Math.floor(rand(counter * 7.1 + i) * 90),
          kind,
          signed,
          deliveryDate,
          supplierName: pick(SUPPLIERS, counter * 3.7 + i * 5.1),
        })
      }

      out.push({
        id: `HO-${deliveryDate.replace(/-/g, '')}-${counter}`,
        city: cityBlock.city,
        entity: hotel.entity,
        hotelName: hotel.name,
        deliveryAddress: hotel.address,
        deliveryDate,
        lines,
      })
    }
  }

  return [...out.sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate)), ...buildDemoHistoryScrollOrders()]
})()
