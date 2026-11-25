import Link from "next/link";
export default function NotFound() {
  return <div><h2 className="vh">Not found</h2><p className="sub">That page or passage doesn&apos;t exist.</p><Link className="btn ghost" href="/read/Gal/5">Go to Galatians 5</Link></div>;
}
