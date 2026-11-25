import { Suspense } from "react";
import { Ask } from "@/components/views/Ask";

export const metadata = { title: "Ask the text · In-sight" };
export default function Page() {
  return <Suspense fallback={<p className="empty">Loading…</p>}><Ask /></Suspense>;
}
