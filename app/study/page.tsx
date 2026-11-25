import { Suspense } from "react";
import { Study } from "@/components/views/Study";

export const metadata = { title: "Study by speaker · In-sight" };
export default function Page() {
  return <Suspense fallback={<p className="empty">Loading…</p>}><Study /></Suspense>;
}
