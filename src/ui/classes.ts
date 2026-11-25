import buttonStyles from "./Button.module.css";
import fieldStyles from "./Field.module.css";

/** Clases para un `<label>` que se ve como botón (subida de archivo). */
export const buttonClass = (variant: "primary" | "secondary" | "dark" = "secondary") =>
  [buttonStyles.button, variant === "primary" && buttonStyles.primary, variant === "dark" && buttonStyles.dark]
    .filter(Boolean)
    .join(" ");

/** La casilla propia de 24 px, para usarla dentro de otra etiqueta. */
export const checkboxBoxClass = fieldStyles.box;
