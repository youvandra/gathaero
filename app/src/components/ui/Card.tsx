import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  title?: string;
  action?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ title, action, children, className, ...rest }: CardProps) {
  return (
    <section className={["card", className].filter(Boolean).join(" ")} {...rest}>
      {(title || action) && (
        <header className="card__header">
          {title && <h2 className="card__title">{title}</h2>}
          {action}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}
