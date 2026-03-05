const express  = require("express");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app      = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());

// ── Sign up ──
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Missing fields");

  // Check if already registered and confirmed
  const { data: existing } = await supabase
    .from("users").select("confirmed").eq("email", email).single();

  if (existing?.confirmed) return res.status(409).send("An account with that email already exists.");

  const hash  = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");

  if (existing) {
    // Unconfirmed — update token so they can resend confirmation
    await supabase.from("users").update({ password_hash: hash, token }).eq("email", email);
  } else {
    const { error } = await supabase.from("users").insert({ email, password_hash: hash, confirmed: false, token });
    if (error) return res.status(500).send(error.message);
  }

  // Return token to frontend so it can build the confirm link
  res.send(token);
});

// ── Confirm email ──
app.post("/confirm", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).send("Missing token");

  const { data, error } = await supabase
    .from("users")
    .update({ confirmed: true, token: null })
    .eq("token", token)
    .select();

  if (error || !data?.length) return res.status(400).send("Invalid or expired confirmation link.");
  res.send("ok");
});

// ── Login ──
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Missing fields");

  const { data } = await supabase
    .from("users").select("password_hash, confirmed").eq("email", email).single();

  if (!data)           return res.status(401).send("No account found with that email.");
  if (!data.confirmed) return res.status(403).send("Please confirm your email before signing in.");

  const match = await bcrypt.compare(password, data.password_hash);
  if (!match)          return res.status(401).send("Incorrect password.");

  res.send("ok");
});

app.listen(3000, () => console.log("SellSync API running"));
