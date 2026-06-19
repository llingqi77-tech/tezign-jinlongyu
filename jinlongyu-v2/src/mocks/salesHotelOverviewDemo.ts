import type { SalesHotelOverviewRow } from '../types/shortage'
import { hotelKey } from '../utils/shortageAggregations'

/** 演示用：销售酒店概览固定 20 家，便于验证分段滚动加载 */
export const DEMO_SALES_HOTEL_OVERVIEW_COUNT = 20

const DEMO_HOTELS: {
  hotelName: string
  deliveryAddress: string
  lineCount: number
  pendingCount: number
  deferCount: number
  urgentCount: number
  processed: boolean
  nearestDelivery: string
}[] = [
  {
    hotelName: '北京香格里拉饭店',
    deliveryAddress: '北京市朝阳区建国门外大街1号',
    lineCount: 5,
    pendingCount: 5,
    deferCount: 2,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-19',
  },
  {
    hotelName: '北京王府半岛酒店',
    deliveryAddress: '北京市东城区金鱼胡同8号',
    lineCount: 1,
    pendingCount: 1,
    deferCount: 0,
    urgentCount: 0,
    processed: false,
    nearestDelivery: '06-19',
  },
  {
    hotelName: '苏州金鸡湖凯宾斯基酒店',
    deliveryAddress: '苏州市工业园区国宾路1号',
    lineCount: 3,
    pendingCount: 3,
    deferCount: 1,
    urgentCount: 0,
    processed: false,
    nearestDelivery: '06-20',
  },
  {
    hotelName: '广州白天鹅宾馆',
    deliveryAddress: '广州市荔湾区沙面南街1号',
    lineCount: 4,
    pendingCount: 4,
    deferCount: 2,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-19',
  },
  {
    hotelName: '深圳福田香格里拉',
    deliveryAddress: '深圳市福田区益田路4088号',
    lineCount: 4,
    pendingCount: 4,
    deferCount: 1,
    urgentCount: 2,
    processed: false,
    nearestDelivery: '06-21',
  },
  {
    hotelName: '上海浦东香格里拉',
    deliveryAddress: '上海市浦东新区富城路33号',
    lineCount: 6,
    pendingCount: 6,
    deferCount: 3,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-19',
  },
  {
    hotelName: '北京饭店',
    deliveryAddress: '北京市东城区东长安街33号',
    lineCount: 2,
    pendingCount: 0,
    deferCount: 1,
    urgentCount: 1,
    processed: true,
    nearestDelivery: '06-18',
  },
  {
    hotelName: '王府井希尔顿酒店',
    deliveryAddress: '北京市东城区王府井东街8号',
    lineCount: 3,
    pendingCount: 3,
    deferCount: 0,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-20',
  },
  {
    hotelName: '上海和平饭店',
    deliveryAddress: '上海市黄浦区南京东路20号',
    lineCount: 2,
    pendingCount: 2,
    deferCount: 1,
    urgentCount: 0,
    processed: false,
    nearestDelivery: '06-22',
  },
  {
    hotelName: '静安瑞吉酒店',
    deliveryAddress: '上海市静安区北京西路1008号',
    lineCount: 5,
    pendingCount: 5,
    deferCount: 2,
    urgentCount: 2,
    processed: false,
    nearestDelivery: '06-19',
  },
  {
    hotelName: '广州花园酒店',
    deliveryAddress: '广州市越秀区环市东路368号',
    lineCount: 3,
    pendingCount: 0,
    deferCount: 2,
    urgentCount: 1,
    processed: true,
    nearestDelivery: '06-18',
  },
  {
    hotelName: '成都富力丽思卡尔顿',
    deliveryAddress: '成都市青羊区顺城大街269号',
    lineCount: 4,
    pendingCount: 4,
    deferCount: 1,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-21',
  },
  {
    hotelName: '成都香格里拉大酒店',
    deliveryAddress: '成都市锦江区滨江东路9号',
    lineCount: 2,
    pendingCount: 2,
    deferCount: 0,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-20',
  },
  {
    hotelName: '杭州西子湖四季酒店',
    deliveryAddress: '杭州市西湖区灵隐路5号',
    lineCount: 3,
    pendingCount: 3,
    deferCount: 1,
    urgentCount: 0,
    processed: false,
    nearestDelivery: '06-23',
  },
  {
    hotelName: '南京金陵饭店',
    deliveryAddress: '南京市鼓楼区汉中路2号',
    lineCount: 2,
    pendingCount: 2,
    deferCount: 1,
    urgentCount: 0,
    processed: false,
    nearestDelivery: '06-22',
  },
  {
    hotelName: '西安曲江威斯汀',
    deliveryAddress: '西安市雁塔区曲江池东路81号',
    lineCount: 4,
    pendingCount: 4,
    deferCount: 2,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-21',
  },
  {
    hotelName: '厦门康莱德酒店',
    deliveryAddress: '厦门市思明区鹭江道16号',
    lineCount: 1,
    pendingCount: 0,
    deferCount: 0,
    urgentCount: 1,
    processed: true,
    nearestDelivery: '06-18',
  },
  {
    hotelName: '青岛海天大酒店',
    deliveryAddress: '青岛市市南区香港西路48号',
    lineCount: 3,
    pendingCount: 3,
    deferCount: 0,
    urgentCount: 2,
    processed: false,
    nearestDelivery: '06-20',
  },
  {
    hotelName: '重庆来福士洲际',
    deliveryAddress: '重庆市渝中区接圣街8号',
    lineCount: 5,
    pendingCount: 5,
    deferCount: 3,
    urgentCount: 1,
    processed: false,
    nearestDelivery: '06-19',
  },
  {
    hotelName: '三亚海棠湾喜来登',
    deliveryAddress: '三亚市海棠区海棠北路76号',
    lineCount: 2,
    pendingCount: 2,
    deferCount: 1,
    urgentCount: 0,
    processed: false,
    nearestDelivery: '06-24',
  },
]

export const DEMO_SALES_HOTEL_OVERVIEW_ROWS: SalesHotelOverviewRow[] = DEMO_HOTELS.map(
  (hotel) => ({
    hotelKey: hotelKey(hotel.hotelName, hotel.deliveryAddress),
    ...hotel,
  })
)

/** 真实数据优先，不足 20 家时用演示酒店补齐 */
export function mergeOverviewHotelsForDemo(
  realHotels: SalesHotelOverviewRow[]
): SalesHotelOverviewRow[] {
  const byKey = new Map(realHotels.map((row) => [row.hotelKey, row]))
  return DEMO_SALES_HOTEL_OVERVIEW_ROWS.map((demo) => byKey.get(demo.hotelKey) ?? demo)
}
