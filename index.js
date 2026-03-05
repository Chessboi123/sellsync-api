const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Password check (creates account automatically on first login)
app.post("/auth", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send("Missing fields");

  const { data: existing } = await supabase
    .from("users")
    .select("password_hash")
    .eq("email", email)
    .single();

  if (existing) {
    const match = await bcrypt.compare(password, existing.password_hash);
    if (!match) return res.status(401).send("Wrong password");
  } else {
    const hash = await bcrypt.hash(password, 10);
    const { error } = await supabase.from("users").insert({ email, password_hash: hash });
    if (error) return res.status(500).send(error.message);
  }

  res.send("ok");
});

// Send verification code
app.post("/send-code", async (req, res) => {
  const { email, code } = req.body;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Your SellSync confirmation code",
      text: `Your verification code is: ${code}`,
    }),
  });
  const data = await response.json();
  if (!response.ok) return res.status(400).json(data);
  res.json({ success: true });
});

app.listen(3000, () => console.log("Running"));
