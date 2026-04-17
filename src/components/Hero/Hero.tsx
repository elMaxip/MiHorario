import "../../index.css";
import styles from "./Hero.module.css";

const Hero = () => {
  return (
    <header className={styles.container}>
      <h1 className={styles.title}>
        Tu éxito académico,{" "}
        <span className={styles.gradient}>perfectamente orquestado.</span>
      </h1>
      <span className={styles.description}>
        Transforma tu lista de asignaturas en un horario visual dinámico y
        profesional en segundos
      </span>
    </header>
  );
};

export default Hero;
