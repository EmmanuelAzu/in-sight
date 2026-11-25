import Link from "next/link";
import { Rainbow } from "@/components/Rainbow";

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Every verse, in sight of what came before</h1>
        <p className="sub">A King James Bible where each verse opens onto the scripture behind it: who is speaking and to whom, what was happening on the ground, the earlier words it draws on, and the Greek and Hebrew underneath.</p>
        <div className="rowf">
          <Link className="btn" href="/read/Gal/5">Start reading · Galatians 5</Link>
          <Link className="btn ghost" href="/threads">Follow a thread</Link>
        </div>
      </section>
      <Rainbow />
      <section className="tiles">
        {[
          ["/read/John/1", "Read with context", "Red letters, speaker tags and a context card for every verse that has one, each line cited."],
          ["/threads", "Threads", "Watch an idea travel from Genesis to Revelation, one linked verse at a time."],
          ["/compare", "Then & now", "See exactly what New Testament writers kept and changed when quoting the Old."],
          ["/study", "Study by speaker", "Read only God's words in the prophets, every prayer, or Jesus quoting scripture."],
          ["/words", "Words", "The Greek and Hebrew behind the English, and where each word is used."],
          ["/ask", "Ask the text", "Answers built only from verses, every sentence cited and checked."],
        ].map(([href, t, d]) => (
          <Link key={href} href={href} className="tile"><b>{t}</b><span>{d}</span></Link>
        ))}
      </section>
    </div>
  );
}
