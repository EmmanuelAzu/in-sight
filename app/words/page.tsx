import { Suspense } from "react";
import { Words } from "@/components/views/Words";

export const metadata = { title: "Words · In-sight" };
export default function Page() {
  return <Suspense fallback={<p className="empty">Loading…</p>}><Words /></Suspense>;
}
