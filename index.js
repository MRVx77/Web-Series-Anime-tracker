import express from "express";
import axios from "axios";
import pg from "pg";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//url way for env -> postgresql://user:password@host:port/database
const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
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

app.get("/add", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.redirect("/");
  }

  const tmdbKey = process.env.TMDB_API_KEY;

  try {
    const [animeRes, seriesRes] = await Promise.all([
      axios.get(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`
      ),
      axios.get(
        `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(
          query
        )}&page=1`
      ),
    ]);

    const animeResults = animeRes.data.data.map((a) => ({
      title: a.title,
      image:
        a.images?.jpg?.large_image_url ||
        a.images?.jpg?.image_url ||
        "https://via.placeholder.com/300x450?text=No+Image",
      type: "Anime",
      rating: a.score || "N/A",
      year: a.year || "N/A",
    }));

    const seriesResults = seriesRes.data.results.map((s) => ({
      title: s.name,
      image: s.poster_path
        ? `https://image.tmdb.org/t/p/w300${s.poster_path}`
        : "/no-image.jpg",
      type: "WebSeries",
      rating: s.vote_average?.toFixed(1) || "N/A",
      year: s.first_air_date ? s.first_air_date.slice(0, 4) : "N/A",
    }));

    const results = [...animeResults, ...seriesResults];

    res.render("add.ejs", { results });
  } catch (err) {
    console.error(err);
    res.render("add.ejs", { results: [] });
  }
});

app.post("/add", async (req, res) => {
  const { title, cover_url, type } = req.body;

  try {
    const exisiting = await db.query("SELECT * FROM shows WHERE title = $1", [
      title,
    ]);
    if (exisiting.rows.length > 0) {
      console.log("Show already exists:", title);
      return res.redirect("/");
    }

    let rating = null;
    let release_year = null;

    if (type === "Anime") {
      const animeRes = await axios.get(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`
      );
      const anime = animeRes.data.data[0];

      if (anime) {
        rating = anime.score || null;
        release_year = anime.aired?.from
          ? parseInt(anime.aired.from.slice(0, 4))
          : null;
      }
    } else {
      const tmdbKey = process.env.TMDB_API_KEY;
      const tmbdRes = await axios.get(
        `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(
          title
        )}&page=1`
      );
      const series = tmbdRes.data.results[0];
      if (series) {
        rating = series.vote_average ? series.vote_average.toFixed(1) : null;
        release_year = series.first_air_date
          ? parseInt(series.first_air_date.slice(0, 4))
          : null;
      }
    }
    await db.query(
      `INSERT INTO shows(title, cover_url, type, rating, release_year, date_added) VALUES($1, $2, $3, $4, $5, NOW())`,
      [title, cover_url, type, rating, release_year]
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

app.post("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM shows WHERE id = $1", [id]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("Error deleting show");
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
