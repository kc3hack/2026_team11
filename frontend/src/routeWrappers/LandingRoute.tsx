import React from "react";
import { useNavigate } from "react-router-dom";
import Landing from "../Landing";

const LandingRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Landing
      onRecordClick={() => navigate("/menu")}
      onHistoryClick={() => navigate("/history")}
    />
  );
};

export default LandingRoute;
