import type {
  SalesHotelDataPanelState,
  SalesHotelGroup,
  SalesHotelLineItem,
  SalesHotelOverviewRow,
  ShortagePO,
} from '../types/shortage'
import { mergeOverviewHotelsForDemo } from '../mocks/salesHotelOverviewDemo'
import { countTodayShortageLines, groupByHotel } from './shortageAggregations'

export const SALES_HOTEL_CMD_PREFIX = '__sales_hotel__:'

export type SalesHotelChannel = 'pending' | 'defer' | 'urgent'

export function isSalesHotelCommand(text: string): boolean {
  return text.startsWith(SALES_HOTEL_CMD_PREFIX)
}

export function classifySalesHotelLine(line: SalesHotelLineItem): SalesHotelChannel {
  if (line.procurementOutcome === 'not_satisfied' || line.fulfillmentMethod === 'defer') {
    return 'defer'
  }
  if (line.procurementOutcome === 'satisfied' || line.fulfillmentMethod === 'satisfied') {
    return 'urgent'
  }
  return 'pending'
}

export function splitSalesHotelLines(group: SalesHotelGroup) {
  const pendingLines: SalesHotelLineItem[] = []
  const deferLines: SalesHotelLineItem[] = []
  const urgentLines: SalesHotelLineItem[] = []
  for (const line of group.lines) {
    const ch = classifySalesHotelLine(line)
    if (ch === 'defer') deferLines.push(line)
    else if (ch === 'urgent') urgentLines.push(line)
    else pendingLines.push(line)
  }
  return { pendingLines, deferLines, urgentLines }
}

function toOverviewRow(group: SalesHotelGroup): SalesHotelOverviewRow {
  const { pendingLines, deferLines, urgentLines } = splitSalesHotelLines(group)
  return {
    hotelKey: group.hotelKey,
    hotelName: group.hotelName,
    deliveryAddress: group.deliveryAddress,
    lineCount: group.lines.length,
    pendingCount: pendingLines.length,
    deferCount: deferLines.length,
    urgentCount: urgentLines.length,
    processed: pendingLines.length === 0,
    nearestDelivery: group.nearestDeliveryDate.slice(5),
  }
}

function findHotelGroup(groups: SalesHotelGroup[], hotelKey: string): SalesHotelGroup | null {
  return groups.find((g) => g.hotelKey === hotelKey) ?? null
}

export function buildSalesHotelPanelState(
  command: string,
  orders: ShortagePO[]
): SalesHotelDataPanelState | null {
  const groups = groupByHotel(orders)
  const realHotels = groups.map(toOverviewRow)
  const hotels = mergeOverviewHotelsForDemo(realHotels)
  const processedHotelCount = hotels.filter((hotel) => hotel.processed).length

  if (command === `${SALES_HOTEL_CMD_PREFIX}open` || command === `${SALES_HOTEL_CMD_PREFIX}back`) {
    return {
      level: 'overview',
      skuCount: countTodayShortageLines(orders, new Date(), 'sales'),
      hotelCount: hotels.length,
      processedHotelCount,
      pendingHotelCount: hotels.length - processedHotelCount,
      hotels,
    }
  }

  const hotelMatch = command.match(/^__sales_hotel__:hotel:(.+)$/)
  if (hotelMatch) {
    const hotelKey = decodeURIComponent(hotelMatch[1])
    const group = findHotelGroup(groups, hotelKey)
    if (!group) return null
    const { pendingLines, deferLines, urgentLines } = splitSalesHotelLines(group)
    return {
      level: 'hotel',
      hotelKey: group.hotelKey,
      hotelName: group.hotelName,
      deliveryAddress: group.deliveryAddress,
      pendingLines,
      deferLines,
      urgentLines,
    }
  }

  return null
}

export function salesHotelReplyForCommand(
  command: string,
  orders: ShortagePO[]
): { text: string; panel: SalesHotelDataPanelState } | null {
  const panel = buildSalesHotelPanelState(command, orders)
  if (!panel) return null

  if (panel.level === 'overview') {
    if (panel.hotelCount === 0) {
      return {
        text: '今日暂无加急、延期或待采购处理的缺货记录。',
        panel,
      }
    }
    return {
      text: `今日缺货 ${panel.skuCount} 个品，涉及 ${panel.hotelCount} 家酒店。\n点选酒店可展开查看待处理、延期与加急明细。`,
      panel,
    }
  }

  const { pendingLines, deferLines, urgentLines } = panel
  return {
    text: `${panel.hotelName}：待处理 ${pendingLines.length} · 延期 ${deferLines.length} · 加急 ${urgentLines.length}。`,
    panel,
  }
}
