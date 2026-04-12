import { BunkManager } from "@/components/bunks/bunk-manager";
import { getBunks, getUserSettings } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function BunksPage() {
  const userId = await requireUser();
  const [bunks, settings] = await Promise.all([getBunks(userId), getUserSettings(userId)]);

  return (
    <BunkManager
      bunks={bunks}
      referenceDate={new Date()}
      initialYesterdayLastBunkNumber={settings.bunkDraftYesterdayLastBunkNumber}
      initialHavePtToday={settings.bunkDraftHavePtToday}
    />
  );
}
