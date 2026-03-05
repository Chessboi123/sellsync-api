const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const RESEND_API_KEY = "re_dgXoFrH5_ECrgy9JyxR34qHiK3vtM6rzP";

app.post("/send-code", async (req, res) => {
  const { email, code } = req.body;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
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
