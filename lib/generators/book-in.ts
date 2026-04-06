import { renderNamedList, renderTemplate } from "@/lib/formatting";
import { renderDetailedRecordList } from "@/lib/generators/parade-state";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";

export type BookInInput = {
  unitName: string;
  totalStrength: number;
  presentStrength: number;
  groupedRecords: {
    ma_oa: Array<{ rank: string; name: string; details?: string }>;
    mc: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    rso: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    rsi: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    cl: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
    others: Array<{ rank: string; name: string; details?: string; startAt?: Date | null; endAt?: Date | null; unknownEndTime?: boolean }>;
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
