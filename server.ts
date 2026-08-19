/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

interface DB {
  users: Array<{
    id: string;
    fullname: string;
    email: string;
    username: string;
    passwordHash: string;
    createdAt: number;
  }>;
  semesters: Array<{
    id: string;
    userId: string;
    semesterName: string;
    courses: any[];
    gpa: number;
    totalUnits: number;
    totalPoints: number;
    createdAt: number;
  }>;
}

const DB_FILE = path.join(process.cwd(), "database.json");

// Helper to load database
function loadDB(): DB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDB: DB = { users: [], semesters: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2), "utf-8");
      return initialDB;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load database. Returning empty schema.", error);
    return { users: [], semesters: [] };
  }
}

// Helper to save database
function saveDB(db: DB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save database.", error);
  }
}

// Simple SHA-256 hashing helper
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. SIGNUP ENDPOINT
  app.post("/api/signup", (req, res) => {
    try {
      const { fullname, email, username, password } = req.body;

      if (!fullname || !email || !username || !password) {
        res.status(400).json({ success: false, message: "All fields are required for sign up." });
        return;
      }

      const db = loadDB();

      // Check username uniqueness
      const existingUserByUsername = db.users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
      if (existingUserByUsername) {
        res.status(400).json({ success: false, message: "Username is already taken." });
        return;
      }

      // Check email uniqueness
      const existingUserByEmail = db.users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (existingUserByEmail) {
        res.status(400).json({ success: false, message: "An account with this email already exists." });
        return;
      }

      const newUser = {
        id: crypto.randomUUID(),
        fullname,
        email,
        username,
        passwordHash: hashPassword(password),
        createdAt: Date.now(),
      };

      db.users.push(newUser);
      saveDB(db);

      res.status(201).json({
        success: true,
        message: "Account created successfully!",
        user: {
          id: newUser.id,
          fullname: newUser.fullname,
          email: newUser.email,
          username: newUser.username,
          createdAt: newUser.createdAt,
        },
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ success: false, message: "Server error occurred during sign up." });
    }
  });

  // 2. LOGIN ENDPOINT
  app.post("/api/login", (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ success: false, message: "Username and password are required." });
        return;
      }

      const db = loadDB();
      const user = db.users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );

      if (!user) {
        res.status(400).json({ success: false, message: "Incorrect username or password." });
        return;
      }

      const incomingHash = hashPassword(password);
      if (user.passwordHash !== incomingHash) {
        res.status(400).json({ success: false, message: "Incorrect username or password." });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Login successful!",
        user: {
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
        },
        token: user.id, // For simple token-based authorization in headers
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: "Server error occurred during login." });
    }
  });

  // Middleware for checking auth header
  const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ success: false, message: "Authorization header is missing." });
      return;
    }

    const db = loadDB();
    const user = db.users.find((u) => u.id === authHeader);

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid user session." });
      return;
    }

    (req as any).user = user;
    next();
  };

  // 3. GET SEMESTERS
  app.get("/api/semesters", authenticateUser, (req, res) => {
    try {
      const user = (req as any).user;
      const db = loadDB();
      const userSemesters = db.semesters.filter((s) => s.userId === user.id);

      // Sort by createdAt descending
      userSemesters.sort((a, b) => b.createdAt - a.createdAt);

      res.status(200).json({ success: true, semesters: userSemesters });
    } catch (err) {
      console.error("Fetch semesters error:", err);
      res.status(500).json({ success: false, message: "Server error occurred." });
    }
  });

  // 4. POST SEMESTER (SAVE / UPDATE)
  app.post("/api/semesters", authenticateUser, (req, res) => {
    try {
      const user = (req as any).user;
      const { id, semesterName, courses, gpa, totalUnits, totalPoints } = req.body;

      if (!semesterName || !courses || !Array.isArray(courses)) {
        res.status(400).json({ success: false, message: "Invalid semester payload." });
        return;
      }

      const db = loadDB();

      if (id) {
        // Find existing
        const index = db.semesters.findIndex((s) => s.id === id && s.userId === user.id);
        if (index !== -1) {
          db.semesters[index] = {
            ...db.semesters[index],
            semesterName,
            courses,
            gpa: Number(gpa),
            totalUnits: Number(totalUnits),
            totalPoints: Number(totalPoints),
          };
        } else {
          // If ID provided but not found, create new
          db.semesters.push({
            id,
            userId: user.id,
            semesterName,
            courses,
            gpa: Number(gpa),
            totalUnits: Number(totalUnits),
            totalPoints: Number(totalPoints),
            createdAt: Date.now(),
          });
        }
      } else {
        // Create new
        const newSemester = {
          id: crypto.randomUUID(),
          userId: user.id,
          semesterName,
          courses,
          gpa: Number(gpa),
          totalUnits: Number(totalUnits),
          totalPoints: Number(totalPoints),
          createdAt: Date.now(),
        };
        db.semesters.push(newSemester);
      }

      saveDB(db);

      const userSemesters = db.semesters.filter((s) => s.userId === user.id);
      userSemesters.sort((a, b) => b.createdAt - a.createdAt);

      res.status(200).json({
        success: true,
        message: "Semester saved successfully!",
        semesters: userSemesters,
      });
    } catch (err) {
      console.error("Save semester error:", err);
      res.status(500).json({ success: false, message: "Server error occurred." });
    }
  });

  // 5. DELETE SEMESTER
  app.delete("/api/semesters/:id", authenticateUser, (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const db = loadDB();
      const initialCount = db.semesters.length;
      db.semesters = db.semesters.filter((s) => !(s.id === id && s.userId === user.id));

      if (db.semesters.length === initialCount) {
        res.status(404).json({ success: false, message: "Semester not found or not owned by user." });
        return;
      }

      saveDB(db);

      const userSemesters = db.semesters.filter((s) => s.userId === user.id);
      userSemesters.sort((a, b) => b.createdAt - a.createdAt);

      res.status(200).json({
        success: true,
        message: "Semester deleted successfully!",
        semesters: userSemesters,
      });
    } catch (err) {
      console.error("Delete semester error:", err);
      res.status(500).json({ success: false, message: "Server error occurred." });
    }
  });

  // Vite Integration for dev mode, and serving build assets for production mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback route for production
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
