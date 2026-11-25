import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "dark";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "regular" | "small";
}

export function Button({ variant = "secondary", size = "regular", className, type = "button", ...rest }: ButtonProps) {
  const cls = [
    styles.button,
    variant === "primary" && styles.primary,
    variant === "dark" && styles.dark,
    size === "small" && styles.small,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={cls} {...rest} />;
}

export function LinkButton({ className, type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={[styles.link, className].filter(Boolean).join(" ")} {...rest} />;
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={[styles.icon, className].filter(Boolean).join(" ")} {...rest} />
  );
}
