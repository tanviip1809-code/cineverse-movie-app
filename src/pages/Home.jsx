// src/pages/Home.jsx
import { useState, useEffect } from "react";
import Banner from "../components/Banner";
import Row from "../components/Row";
import GenreTabs from "../components/GenreTabs";
import { genreMap } from "../services/api";

const API_KEY = "fdb19de6314c42882e0e5c538a4a2588";

function Home() {
    const [activeGenre, setActiveGenre] = useState("all");
    const [continueWatching, setContinueWatching] = useState([]);
    const [recentMovies, setRecentMovies] = useState([]);

    useEffect(() => {
        setRecentMovies(JSON.parse(localStorage.getItem("recent")) || []);
        setContinueWatching(JSON.parse(localStorage.getItem("continueWatching")) || []);
    }, []);

    return (
        <div className="bg-black min-h-screen">
            {/* Navbar is rendered globally in App.jsx — do NOT render it here */}

            <Banner />

            <GenreTabs activeGenre={activeGenre} setActiveGenre={setActiveGenre} />

            {recentMovies.length > 0 && (
                <Row title="Recently Viewed" movies={recentMovies} />
            )}

            {continueWatching.length > 0 && (
                <Row title="Continue Watching" movies={continueWatching} />
            )}

            <Row title={activeGenre} fetchUrl={genreMap[activeGenre]} />
        </div>
    );
}

export default Home;