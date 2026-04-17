import { useSetAtom } from "jotai";
import { useState } from "react";
import { fileAtom } from "../../App";
import Hero from "../../components/Hero/Hero";
import FileUploader from "../../components/FileUploader/FileUploader";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const setFile = useSetAtom(fileAtom);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer) return;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleFile = (file: File) => {
    setFile(file);
    navigate("/planner");
  };

  return (
    <main
      className={`home ${isDragging ? "dragging" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Hero />
      <FileUploader handleFile={handleFile} />
    </main>
  );
};

export default Home;
