import { Suspense } from "react";
import { Compare } from "@/components/views/Compare";

export const metadata = { title: "Then & now · In-sight" };
export default function Page() {
  return <Suspense fallback={<p className="empty">Loading…</p>}><Compare /></Suspense>;
}
