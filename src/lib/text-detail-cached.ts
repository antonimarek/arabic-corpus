import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { fetchTextDetail } from "@/lib/text-detail";

/** Same-request dedupe for RSC (Today + detail). Server-only. */
export const fetchTextDetailCached = cache(async (id: string) => {
  const supabase = await createClient();
  return fetchTextDetail(supabase, id);
});
