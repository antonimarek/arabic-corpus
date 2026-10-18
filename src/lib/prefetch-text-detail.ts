"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { createClient } from "@/lib/supabase/client";
import { writeTextDetailCache } from "@/lib/text-detail-cache";
import { fetchTextDetail, textQueryKey } from "@/lib/text-detail";

/** Warm React Query + sessionStorage before navigation. */
export function usePrefetchTextDetail() {
  const queryClient = useQueryClient();

  return useCallback(
    (id: string) => {
      if (!id) return;
      void queryClient.prefetchQuery({
        queryKey: textQueryKey(id),
        queryFn: async () => {
          const data = await fetchTextDetail(createClient(), id);
          writeTextDetailCache(data);
          return data;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient],
  );
}

export function textDetailHref(id: string): string {
  return `/texts/${id}`;
}
