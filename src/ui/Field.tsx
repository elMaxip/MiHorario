import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import styles from "./Field.module.css";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode;
  fieldClassName?: string;
}

export function SelectField({ label, fieldClassName, className, children, ...rest }: SelectFieldProps) {
  return (
    <label className={[styles.field, fieldClassName].filter(Boolean).join(" ")}>
      {label}
      <select className={[styles.control, styles.select, className].filter(Boolean).join(" ")} {...rest}>
        {children}
      </select>
    </label>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  fieldClassName?: string;
}

export function TextField({ label, fieldClassName, className, ...rest }: TextFieldProps) {
  return (
    <label className={[styles.field, fieldClassName].filter(Boolean).join(" ")}>
      {label}
      <input className={[styles.control, className].filter(Boolean).join(" ")} {...rest} />
    </label>
  );
}

/** Select sin etiqueta visible (la etiqueta va en `aria-label`). */
export function BareSelect({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={[styles.control, styles.select, className].filter(Boolean).join(" ")} {...rest} />;
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.check, className].filter(Boolean).join(" ")}>
      <input type="checkbox" className={styles.box} {...rest} />
      <span>{label}</span>
    </label>
  );
}
