import express from "express";
import axios from "axios";
import pg from "pg";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "webseriestracker",
  password: "mrv7777",
  port: 5432,
});

db.connect();

app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM shows ORDER BY date_added DESC"
    );
    const shows = result.rows;
    res.render("index.ejs", { shows: shows });
  } catch (err) {
    console.error(err);
    res.send("Error fetching shows");
  }
});

app.get("/search", async (req, res) => {
  const { query, type } = req.query;
  try {
    let apiUrl = "";
    if (type === "Anime") {
      apiUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(
        query
      )}&limit=7`;
    } else {
      const tmdbKey = process.env.TMDB_API_KEY;
      apiUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(
        query
      )}&page=1`;
    }

    const response = await axios.get(apiUrl);

    let results = [];
    if (type === "Anime") {
      results = response.data.data.map((anime) => ({
        title: anime.title,
        cover:
          anime.images?.jpg?.large_image_url ||
          anime.images?.jpg?.image_url ||
          "https://via.placeholder.com/100x150?text=No+Image",
      }));
    } else {
      results = response.data.results.map((series) => ({
        title: series.name,
        cover: series.poster_path
          ? `https://image.tmdb.org/t/p/w300${series.poster_path}`
          : "https://via.placeholder.com/100x150?text=No+Image",
      }));
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

app.post("/add", async (req, res) => {});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
