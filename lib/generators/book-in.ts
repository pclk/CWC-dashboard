import { renderNamedList, renderTemplate } from "@/lib/formatting";
import { DEFAULT_TEMPLATE_BODIES } from "@/lib/templates";

export type BookInInput = {
  unitName: string;
  totalStrength: number;
  presentStrength: number;
  groupedRecords: {
    ma_oa: Array<{ rank: string; name: string; details?: string }>;
    mc: Array<{ rank: string; name: string; details?: string }>;
    rso: Array<{ rank: string; name: string; details?: string }>;
    rsi: Array<{ rank: string; name: string; details?: string }>;
    cl: Array<{ rank: string; name: string; details?: string }>;
    others: Array<{ rank: string; name: string; details?: string }>;
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
    mcBlock: renderNamedList(input.groupedRecords.mc),
    rsoBlock: renderNamedList(input.groupedRecords.rso),
    rsiBlock: renderNamedList(input.groupedRecords.rsi),
    clBlock: renderNamedList(input.groupedRecords.cl),
    othersBlock: renderNamedList(input.groupedRecords.others),
  }).trim();
}
