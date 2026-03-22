const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const COOKIE_NAME = "hail_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax", // "none" required for cross-origin cookies
    maxAge: COOKIE_MAX_AGE * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: "14d",
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json({ success: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message || "Signup failed." });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);

    res.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message || "Login failed." });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

// ─── GET /api/auth/session ────────────────────────────────────────────────────
router.get("/session", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.json({ authenticated: false });

    const payload = verifyToken(token);
    if (!payload) return res.json({ authenticated: false });

    const user = await User.findById(payload.sub).select("name email");
    if (!user) return res.json({ authenticated: false });

    res.json({ authenticated: true, user: { name: user.name, email: user.email } });
  } catch {
    res.json({ authenticated: false });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true }); // prevent email enumeration
    }

    // Generate 6-digit OTP code
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    user.resetToken = hashedOtp;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    // Send email via nodemailer (Gmail SMTP port 465 SSL)
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: `"Severe Weather Intelligence" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Your password reset code",
        html: `
          <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #03070f; color: #eef3ff; border: 1px solid #17325f; border-radius: 12px; padding: 32px;">
            <h2 style="color: #76a8ff; margin-top: 0;">Password reset code</h2>
            <p style="color: #7ea2df;">Hi ${user.name},</p>
            <p style="color: #7ea2df;">Use the code below to reset your password. It expires in 15 minutes.</p>
            <div style="margin: 24px 0; text-align: center;">
              <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #ffffff; background: #0d1f3c; padding: 16px 28px; border-radius: 12px; border: 1px solid #17325f;">${otp}</span>
            </div>
            <p style="color: #4d6797; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
      console.log("OTP email sent to:", user.email);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("forgot-password error:", err.message);
    res.json({ success: true });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required." });
    }

    const hashedOtp = crypto.createHash("sha256").update(String(code)).digest("hex");
    const user = await User.findOne({
      email,
      resetToken: hashedOtp,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired code." });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Verification failed." });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, password } = req.body || {};

    if (!email || !code || !password) {
      return res.status(400).json({ error: "Email, code and new password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const hashedOtp = crypto.createHash("sha256").update(String(code)).digest("hex");
    const user = await User.findOne({
      email,
      resetToken: hashedOtp,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired code." });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    const jwtToken = signToken(user._id);
    setAuthCookie(res, jwtToken);

    res.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message || "Password reset failed." });
  }
});

module.exports = router;
