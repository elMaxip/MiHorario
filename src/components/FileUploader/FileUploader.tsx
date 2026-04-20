import { useRef } from "react";
import styles from "./FileUploader.module.css";
import { useSetAtom } from "jotai";
import { fileAtom } from "../../App";
import Button from "../Button/Button";

interface Props {
  handleFile: (file: File) => void;
}

const FileUploader = ({ handleFile }: Props) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const setFile = useSetAtom(fileAtom);

  const openFileSelector = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div className={styles.container} onClick={openFileSelector}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept=".xlsx"
      />

      <div className={styles.icon}>
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 10V4C0 2.9 0.391667 1.95833 1.175 1.175C1.95833 0.391667 2.9 0 4 0H32C33.1 0 34.0417 0.391667 34.825 1.175C35.6083 1.95833 36 2.9 36 4V10H0ZM4 36C2.9 36 1.95833 35.6083 1.175 34.825C0.391667 34.0417 0 33.1 0 32V14H9V36H4ZM27 36V14H36V32C36 33.1 35.6083 34.0417 34.825 34.825C34.0417 35.6083 33.1 36 32 36H27ZM13 36V14H23V36H13Z"
            fill="#7C5800"
          />
        </svg>
      </div>

      <div className={styles.optionContainer}>
        <span>Arrastra tu archivo aquí</span>
        <span>o presiona el botón para subirlo desde tu dispositivo</span>
        <Button>Seleccionar excel</Button>
      </div>

      <div className={styles.badges}>
        <span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.01667 8.51667L9.12917 4.40417L8.3125 3.5875L5.01667 6.88333L3.35417 5.22083L2.5375 6.0375L5.01667 8.51667ZM5.83333 11.6667C5.02639 11.6667 4.26806 11.5135 3.55833 11.2073C2.84861 10.901 2.23125 10.4854 1.70625 9.96042C1.18125 9.43542 0.765625 8.81806 0.459375 8.10833C0.153125 7.39861 0 6.64028 0 5.83333C0 5.02639 0.153125 4.26806 0.459375 3.55833C0.765625 2.84861 1.18125 2.23125 1.70625 1.70625C2.23125 1.18125 2.84861 0.765625 3.55833 0.459375C4.26806 0.153125 5.02639 0 5.83333 0C6.64028 0 7.39861 0.153125 8.10833 0.459375C8.81806 0.765625 9.43542 1.18125 9.96042 1.70625C10.4854 2.23125 10.901 2.84861 11.2073 3.55833C11.5135 4.26806 11.6667 5.02639 11.6667 5.83333C11.6667 6.64028 11.5135 7.39861 11.2073 8.10833C10.901 8.81806 10.4854 9.43542 9.96042 9.96042C9.43542 10.4854 8.81806 10.901 8.10833 11.2073C7.39861 11.5135 6.64028 11.6667 5.83333 11.6667ZM5.83333 10.5C7.13611 10.5 8.23958 10.0479 9.14375 9.14375C10.0479 8.23958 10.5 7.13611 10.5 5.83333C10.5 4.53056 10.0479 3.42708 9.14375 2.52292C8.23958 1.61875 7.13611 1.16667 5.83333 1.16667C4.53056 1.16667 3.42708 1.61875 2.52292 2.52292C1.61875 3.42708 1.16667 4.53056 1.16667 5.83333C1.16667 7.13611 1.61875 8.23958 2.52292 9.14375C3.42708 10.0479 4.53056 10.5 5.83333 10.5Z"
              fill="#514532"
            />
          </svg>
          Solo formato .xlsx
        </span>
      </div>
    </div>
  );
};

export default FileUploader;
