import type { ReactNode } from "react";

import videoSrc from "../../assets/hero.mp4";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <video
        className="fixed inset-0 h-full w-full object-cover"
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/75 to-[#05060a]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteNav />
        <main className="flex-1 px-5 pb-8 pt-2 sm:px-8 lg:px-12">{children}</main>
        <SiteFooter />
      </div>
    </section>
  );
}
