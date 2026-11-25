import type { Metadata, Viewport } from "next";
import { EB_Garamond, Frank_Ruhl_Libre, Pixelify_Sans, Source_Sans_3 } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";
import "./textures.css";
import "./theme-block.css";

const serif = EB_Garamond({ subsets: ["latin", "greek", "greek-ext"], variable: "--f-serif", display: "swap" });
const hebrew = Frank_Ruhl_Libre({ subsets: ["hebrew"], variable: "--f-hebrew", display: "swap" });
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--f-sans", display: "swap" });
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--f-pixel", display: "swap" });

export const metadata: Metadata = {
  title: "In-sight · every verse in sight of what came before",
  description: "A King James Bible where every verse opens onto the scripture behind it: context from the text, cross-references, quotations, speakers, and the Greek and Hebrew.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${hebrew.variable} ${sans.variable} ${pixel.variable}`}>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
