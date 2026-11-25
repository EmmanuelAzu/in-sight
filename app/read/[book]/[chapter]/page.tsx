import { notFound } from "next/navigation";
import { BOOK } from "@/lib/books";
import { Reader } from "@/components/views/Reader";

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  return { title: `${BOOK[book]?.name ?? "Bible"} ${chapter} · In-sight` };
}
export default async function Page({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  const c = Number(chapter);
  if (!BOOK[book] || !Number.isInteger(c) || c < 1 || c > 150) notFound();
  return <Reader b={book} c={c} />;
}
