import { Suspense } from "react";
import { Threads } from "@/components/views/Threads";

export const metadata = { title: "Threads · In-sight" };
export default function Page() {
  return <Suspense fallback={<p className="empty">Loading…</p>}><Threads /></Suspense>;
}
