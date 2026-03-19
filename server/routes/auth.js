const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

const COOKIE_NAME = "hail_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
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

    // Always respond with success to prevent email enumeration
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true });
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const resetUrl = `${appUrl}?token=${rawToken}`;

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Severe Weather Intelligence" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset your password",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #03070f; color: #eef3ff; border: 1px solid #17325f; border-radius: 12px; padding: 32px;">
          <h2 style="color: #76a8ff; margin-top: 0;">Reset your password</h2>
          <p style="color: #7ea2df;">Hi ${user.name},</p>
          <p style="color: #7ea2df;">We received a request to reset your password. Click the button below to create a new password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; margin: 20px 0; padding: 13px 28px; background: #5e86f0; color: #f8fbff; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
            Reset Password
          </a>
          <p style="color: #4d6797; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #4d6797; font-size: 11px; word-break: break-all;">Or copy this link: ${resetUrl}</p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to send reset email." });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required." });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or has expired." });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    // Auto-login after reset
    const jwtToken = signToken(user._id);
    setAuthCookie(res, jwtToken);

    res.json({ success: true, user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message || "Password reset failed." });
  }
});

module.exports = router;
