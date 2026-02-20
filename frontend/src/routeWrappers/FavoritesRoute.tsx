import React from "react";
import { useNavigate } from "react-router-dom";
import FavoritesPage from "../FavoritesPage";
import { useAppContext } from "../contexts/AppContext";

const FavoritesRoute: React.FC = () => {
  const navigate = useNavigate();
  const { userRange } = useAppContext();

  return (
    <FavoritesPage
      userRange={userRange}
      onLoginClick={() => navigate("/login")}
    />
  );
};

export default FavoritesRoute;
