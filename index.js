import express from "express";
import axios from "axios";
import pg from "pg";

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

app.post("/add", async (req, res) => {
  ////
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
