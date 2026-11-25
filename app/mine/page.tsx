import { Suspense } from "react";
import { Mine } from "@/components/views/Mine";

export const metadata = { title: "My study · In-sight" };
export default function Page() {
  return <Suspense fallback={<p className="empty">Loading…</p>}><Mine /></Suspense>;
}
