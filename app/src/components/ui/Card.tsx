import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  title?: string;
  action?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ title, action, children, className, ...rest }: CardProps) {
  return (
    <section
      className={["rounded-2xl bg-white/10 p-5 backdrop-blur-lg", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold text-white">{title}</h2>}
          {action}
        </header>
      )}
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  );
}
