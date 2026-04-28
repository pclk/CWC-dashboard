import { renderNamedList, renderTemplate } from "@/lib/formatting";
import { renderDetailedRecordList } from "@/lib/generators/parade-state";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";

export type BookInInput = {
  unitName: string;
  totalStrength: number;
  presentStrength: number;
  groupedRecords: {
    ma_oa: Array<{ name: string; details?: string }>;
    mc: Array<{ name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    rso: Array<{ name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    rsi: Array<{ name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    cl: Array<{ name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    others: Array<{ name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
  };
};

export function generateBookInMessage(
  input: BookInInput,
  template = DEFAULT_TEMPLATE_BODIES.BOOK_IN,
) {
  return renderTemplate(template, {
    unitName: input.unitName,
    totalStrength: input.totalStrength,
    presentStrength: input.presentStrength,
    ma_oaBlock: renderNamedList(input.groupedRecords.ma_oa),
    mcBlock: renderDetailedRecordList(input.groupedRecords.mc),
    rsoBlock: renderDetailedRecordList(input.groupedRecords.rso),
    rsiBlock: renderDetailedRecordList(input.groupedRecords.rsi),
    clBlock: renderDetailedRecordList(input.groupedRecords.cl),
    othersBlock: renderDetailedRecordList(input.groupedRecords.others),
  }).trim();
}
