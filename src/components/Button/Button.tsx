import type { ReactNode } from "react";
import styles from "./Button.module.css";

interface Props {
  onClick?: () => void;
  children?: ReactNode;
}

const Button = ({ onClick, children }: Props) => {
  return (
    <button onClick={onClick} className={styles.button}>
      {children}
    </button>
  );
};

export default Button;
