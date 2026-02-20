import React from "react";
import { useNavigate } from "react-router-dom";
import Home from "../Home";

const HomeRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Home
      onNormalClick={() => navigate("/record")}
      onKaraokeClick={() => navigate("/karaoke")}
      onUploadClick={() => navigate("/upload")}
      onHistoryClick={() => navigate("/history")}
    />
  );
};

export default HomeRoute;
