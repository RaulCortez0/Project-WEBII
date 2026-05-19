import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import dotenv from "dotenv";
import Usuario from "../models/Usuario.js";
import logger from "../utils/logger.js";

dotenv.config();

// ─── Passport serialización ───────────────────────────────────────────────────
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ─── Google Strategy ─────────────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      const baseUsername = profile.displayName.replace(/\s/g, "_").toLowerCase();
      let username = baseUsername.substring(0, 30);
      const existing = await Usuario.findOne({ where: { username } });
      if (existing) username = username + "_" + Date.now().toString().slice(-4);
      usuario = await Usuario.create({
        username,
        email,
        avatar_url: profile.photos[0]?.value,
        oauth_provider: "google"
      });
      logger.info(`OAuth Google: nuevo usuario creado — ${email}`);
    } else {
      logger.info(`OAuth Google: login exitoso — ${email}`);
    }
    const { password: _, ...userData } = usuario.toJSON();
    return done(null, userData);
  } catch (err) {
    logger.error("OAuth Google error:", err);
    return done(err);
  }
}));

// ─── GitHub Strategy ─────────────────────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "http://localhost:3001/auth/github/callback",
  scope: ["user:email"]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
    let usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      let username = (profile.username || profile.id).substring(0, 30);
      const existing = await Usuario.findOne({ where: { username } });
      if (existing) username = username + "_" + Date.now().toString().slice(-4);
      usuario = await Usuario.create({
        username,
        email,
        avatar_url: profile.photos[0]?.value,
        oauth_provider: "github"
      });
      logger.info(`OAuth GitHub: nuevo usuario creado — ${email}`);
    } else {
      logger.info(`OAuth GitHub: login exitoso — ${email}`);
    }
    const { password: _, ...userData } = usuario.toJSON();
    return done(null, userData);
  } catch (err) {
    logger.error("OAuth GitHub error:", err);
    return done(err);
  }
}));

export default passport;
