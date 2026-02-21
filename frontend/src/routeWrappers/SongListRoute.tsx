import React from "react";
import { useNavigate } from "react-router-dom";
import SongListPage from "../SongListPage";
import { useAppContext } from "../contexts/AppContext";

const SongListRoute: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, userRange } = useAppContext();

  return (
    <SongListPage
      searchQuery={searchQuery}
      userRange={userRange}
      onLoginClick={() => navigate("/login")}
      onSearchChange={setSearchQuery}
    />
  );
};

export default SongListRoute;
