/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Save, 
  LogOut, 
  User as UserIcon, 
  Lock, 
  Mail, 
  BookOpen, 
  Award, 
  History, 
  RotateCcw, 
  Info,
  ChevronRight,
  Sparkles,
  Phone,
  Calculator,
  UserCheck,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Course, Semester, User, AuthResponse, SavedHistoryResponse } from "./types";

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("gpa_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("gpa_token") || null;
  });

  // Auth View Toggle: "login" or "signup"
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Form states
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Calculator states
  const [activeTab, setActiveTab] = useState<"gpa" | "cgpa">("gpa");
  const [scale, setScale] = useState<5 | 4>(5);
  const [semesterName, setSemesterName] = useState("Semester 1");
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);

  // GPA calculation list
  const [courses, setCourses] = useState<Course[]>([
    { id: "1", name: "", score: "", grade: "", units: 3 },
    { id: "2", name: "", score: "", grade: "", units: 3 },
    { id: "3", name: "", score: "", grade: "", units: 2 },
    { id: "4", name: "", score: "", grade: "", units: 3 },
  ]);

  // CGPA semesters list
  interface CGPASemester {
    id: string;
    semesterName: string;
    courses: Course[];
  }
  const [cgpaSemesters, setCgpaSemesters] = useState<CGPASemester[]>([
    {
      id: "sem-1",
      semesterName: "Semester 1",
      courses: [
        { id: "c1-1", name: "", score: "", grade: "", units: 3 },
        { id: "c1-2", name: "", score: "", grade: "", units: 3 },
        { id: "c1-3", name: "", score: "", grade: "", units: 2 },
        { id: "c1-4", name: "", score: "", grade: "", units: 3 },
      ]
    },
    {
      id: "sem-2",
      semesterName: "Semester 2",
      courses: [
        { id: "c2-1", name: "", score: "", grade: "", units: 3 },
        { id: "c2-2", name: "", score: "", grade: "", units: 3 },
        { id: "c2-3", name: "", score: "", grade: "", units: 2 },
        { id: "c2-4", name: "", score: "", grade: "", units: 3 },
      ]
    }
  ]);

  // Saved History states
  const [savedSemesters, setSavedSemesters] = useState<Semester[]>([]);

  // Synchronize cgpaSemesters with savedSemesters when savedSemesters is loaded (e.g. on login)
  useEffect(() => {
    if (savedSemesters.length > 0) {
      setCgpaSemesters(savedSemesters.map(s => ({
        id: s.id,
        semesterName: s.semesterName,
        courses: s.courses.map(c => ({
          id: c.id || String(Math.random()),
          name: c.name || "",
          score: c.score || "",
          grade: c.grade || "",
          units: Number(c.units) || 3
        }))
      })));
    }
  }, [savedSemesters]);

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load username on mount if saved
  useEffect(() => {
    const savedUsername = localStorage.getItem("gpa_remembered_username");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  // Sync user/token to local storage
  const handleAuthSuccess = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("gpa_user", JSON.stringify(userData));
    localStorage.setItem("gpa_token", userToken);
    if (rememberMe) {
      localStorage.setItem("gpa_remembered_username", userData.username);
    } else {
      localStorage.removeItem("gpa_remembered_username");
    }
    setAuthError(null);
    setAuthSuccess("Logged in successfully!");
    // Fetch user's semesters
    fetchSemesters(userToken);
  };

  // Fetch semesters from the server
  const fetchSemesters = async (sessionToken: string) => {
    if (!sessionToken) return;
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/semesters", {
        headers: {
          "Authorization": sessionToken,
        },
      });
      const data: SavedHistoryResponse = await response.json();
      if (data.success) {
        setSavedSemesters(data.semesters);
      }
    } catch (err) {
      console.error("Failed to fetch semesters:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Initial load of history if user is logged in
  useEffect(() => {
    if (token) {
      fetchSemesters(token);
    }
  }, [token]);

  // Signup Submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, email, username, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setAuthError(data.message || "Failed to sign up.");
        return;
      }

      setAuthSuccess("Account created successfully! Logging you in...");
      // Directly log in after signing up
      const loginResponse = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const loginData = await loginResponse.json();
      if (loginData.success) {
        handleAuthSuccess(loginData.user, loginData.token);
      } else {
        setAuthMode("login");
      }
    } catch (err) {
      setAuthError("Could not connect to the server.");
    }
  };

  // Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setAuthError(data.message || "Invalid credentials.");
        return;
      }

      handleAuthSuccess(data.user, data.token);
    } catch (err) {
      setAuthError("Could not connect to the server.");
    }
  };

  // Logout Action
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("gpa_user");
    localStorage.removeItem("gpa_token");
    setSavedSemesters([]);
    setEditingSemesterId(null);
    // Keep username in state if remembered, otherwise clear
    if (!localStorage.getItem("gpa_remembered_username")) {
      setUsername("");
    }
    setPassword("");
    setFullname("");
    setEmail("");
    setAuthSuccess("Logged out successfully.");
  };

  // Score to Grade Converter logic
  const getGradeFromScore = (scoreVal: string | number): string => {
    const num = Number(scoreVal);
    if (isNaN(num) || scoreVal === "") return "";
    
    if (scale === 5) {
      // Standard Nigerian grading scale
      if (num >= 70) return "A";
      if (num >= 60) return "B";
      if (num >= 50) return "C";
      if (num >= 45) return "D";
      if (num >= 40) return "E";
      return "F";
    } else {
      // Standard 4.0 grading scale
      if (num >= 80) return "A";
      if (num >= 70) return "B";
      if (num >= 60) return "C";
      if (num >= 50) return "D";
      return "F";
    }
  };

  // Grade Points Calculator
  const getPointsForGrade = (grade: string): number => {
    const upperGrade = grade.trim().toUpperCase();
    if (scale === 5) {
      switch (upperGrade) {
        case "A": return 5;
        case "B": return 4;
        case "C": return 3;
        case "D": return 2;
        case "E": return 1;
        case "F": return 0;
        default: return 0;
      }
    } else {
      switch (upperGrade) {
        case "A": return 4;
        case "B": return 3;
        case "C": return 2;
        case "D": return 1;
        case "F": return 0;
        default: return 0;
      }
    }
  };

  // Handler for course changes (Score input syncs to Grade)
  const handleCourseChange = (id: string, field: keyof Course, value: any) => {
    setCourses(prev =>
      prev.map(course => {
        if (course.id === id) {
          const updated = { ...course, [field]: value };
          
          // Auto-sync score to grade
          if (field === "score") {
            const grade = getGradeFromScore(value);
            if (grade !== "") {
              updated.grade = grade;
            }
          }
          
          return updated;
        }
        return course;
      })
    );
  };

  // Add a new course row
  const addCourseRow = () => {
    const nextId = String(Date.now() + Math.random());
    setCourses(prev => [...prev, { id: nextId, name: "", score: "", grade: "", units: 3 }]);
  };

  // Remove a course row
  const removeCourseRow = (id: string) => {
    if (courses.length <= 1) return;
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  // Clear all fields
  const clearCalculator = () => {
    setCourses([
      { id: "1", name: "", score: "", grade: "", units: 3 },
      { id: "2", name: "", score: "", grade: "", units: 3 },
      { id: "3", name: "", score: "", grade: "", units: 2 },
      { id: "4", name: "", score: "", grade: "", units: 3 },
    ]);
    setSemesterName(`Semester ${savedSemesters.length + 1}`);
    setEditingSemesterId(null);
    setActionMessage(null);
  };

  // Calculate live active GPA metrics
  const calculateGPAStats = () => {
    let totalPoints = 0;
    let totalUnits = 0;
    let filledRows = 0;

    courses.forEach(c => {
      if (c.grade !== "") {
        const gp = getPointsForGrade(c.grade);
        totalPoints += gp * Number(c.units);
        totalUnits += Number(c.units);
        filledRows++;
      }
    });

    const gpa = totalUnits > 0 ? Number((totalPoints / totalUnits).toFixed(2)) : 0.0;
    return { gpa, totalUnits, totalPoints, filledRows };
  };

  const currentGPAStats = calculateGPAStats();

  // Save/Update current Semester to Database
  const saveSemesterToHistory = async () => {
    if (!token) {
      setActionMessage({ type: "error", text: "Please sign in or register to save your GPA data." });
      return;
    }

    if (currentGPAStats.filledRows === 0) {
      setActionMessage({ type: "error", text: "Please enter at least one course with a grade to save." });
      return;
    }

    setSaveLoading(true);
    setActionMessage(null);

    const payload = {
      id: editingSemesterId || undefined,
      semesterName: semesterName.trim() || `Semester ${savedSemesters.length + 1}`,
      courses: courses.filter(c => c.grade !== ""),
      gpa: currentGPAStats.gpa,
      totalUnits: currentGPAStats.totalUnits,
      totalPoints: currentGPAStats.totalPoints,
    };

    try {
      const response = await fetch("/api/semesters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setSavedSemesters(data.semesters);
        setActionMessage({
          type: "success",
          text: editingSemesterId 
            ? "Semester calculation updated successfully!" 
            : "Semester calculation saved successfully!",
        });
        
        // If it was a new semester, we can assign the generated ID from the response
        if (!editingSemesterId) {
          // Find the most recently added semester
          const latest = data.semesters[0];
          if (latest) {
            setEditingSemesterId(latest.id);
          }
        }
      } else {
        setActionMessage({ type: "error", text: data.message || "Failed to save calculation." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "Error communicating with the database." });
    } finally {
      setSaveLoading(false);
    }
  };

  // Load saved semester back into GPA Editor
  const loadSemesterToEdit = (semester: Semester) => {
    setEditingSemesterId(semester.id);
    setSemesterName(semester.semesterName);
    
    // Create new course array representing saved data
    const mappedCourses = semester.courses.map(c => ({
      id: c.id || String(Math.random()),
      name: c.name || "",
      score: c.score || "",
      grade: c.grade || "",
      units: Number(c.units) || 3,
    }));

    // Ensure we have at least 4 rows for aesthetics
    while (mappedCourses.length < 4) {
      mappedCourses.push({
        id: String(Date.now() + Math.random()),
        name: "",
        score: "",
        grade: "",
        units: 3,
      });
    }

    setCourses(mappedCourses);
    setActiveTab("gpa");
    setActionMessage({ type: "success", text: `Loaded "${semester.semesterName}" details.` });
  };

  // Delete saved semester
  const deleteSemesterFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading to edit
    if (!token) return;

    if (!confirm("Are you sure you want to delete this saved semester?")) return;

    try {
      const response = await fetch(`/api/semesters/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": token,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSavedSemesters(data.semesters);
        if (editingSemesterId === id) {
          setEditingSemesterId(null);
          setSemesterName(`Semester ${data.semesters.length + 1}`);
        }
        setActionMessage({ type: "success", text: "Semester calculation deleted." });
      } else {
        setActionMessage({ type: "error", text: data.message || "Failed to delete semester." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "Error communicating with database." });
    }
  };

  // Functional CGPA Calculation over multiple semesters of courses
  const calculateCgpaFromSemesters = () => {
    let grandTotalPoints = 0;
    let grandTotalUnits = 0;
    
    // Compute individual stats for each semester
    const semestersStats = cgpaSemesters.map(s => {
      let semPoints = 0;
      let semUnits = 0;
      let filled = 0;
      
      s.courses.forEach(c => {
        if (c.grade !== "") {
          const gp = getPointsForGrade(c.grade);
          semPoints += gp * Number(c.units);
          semUnits += Number(c.units);
          filled++;
        }
      });
      
      const gpa = semUnits > 0 ? Number((semPoints / semUnits).toFixed(2)) : 0.0;
      
      grandTotalPoints += semPoints;
      grandTotalUnits += semUnits;
      
      return {
        id: s.id,
        gpa,
        totalUnits: semUnits,
        totalPoints: semPoints,
        filled
      };
    });
    
    const cgpa = grandTotalUnits > 0 ? Number((grandTotalPoints / grandTotalUnits).toFixed(2)) : 0.0;
    
    return {
      cgpa,
      totalUnits: grandTotalUnits,
      totalPoints: grandTotalPoints,
      semestersStats
    };
  };

  const activeCgpaStats = calculateCgpaFromSemesters();

  // CGPA list handlers
  const addCgpaSemester = () => {
    const nextSemNum = cgpaSemesters.length + 1;
    const newSemId = "sem-" + Date.now();
    setCgpaSemesters(prev => [
      ...prev,
      {
        id: newSemId,
        semesterName: `Semester ${nextSemNum}`,
        courses: [
          { id: `c-${newSemId}-1`, name: "", score: "", grade: "", units: 3 },
          { id: `c-${newSemId}-2`, name: "", score: "", grade: "", units: 3 },
          { id: `c-${newSemId}-3`, name: "", score: "", grade: "", units: 2 },
          { id: `c-${newSemId}-4`, name: "", score: "", grade: "", units: 3 },
        ]
      }
    ]);
  };

  const removeCgpaSemester = async (semId: string) => {
    if (cgpaSemesters.length <= 1) {
      setActionMessage({ type: "error", text: "At least one semester is required for CGPA calculation." });
      return;
    }

    // Ask confirmation if it contains filled courses
    const sem = cgpaSemesters.find(s => s.id === semId);
    if (sem && sem.courses.some(c => c.name !== "" || c.grade !== "")) {
      if (!confirm(`Are you sure you want to remove "${sem.semesterName}"? All its course details will be lost.`)) {
        return;
      }
    }

    setCgpaSemesters(prev => prev.filter(s => s.id !== semId));

    // If it's a saved semester in the database, offer to let them delete it from database too, or just do local removal
    if (token && sem && !semId.startsWith("sem-")) {
      if (confirm(`Do you also want to delete "${sem.semesterName}" permanently from your cloud database?`)) {
        try {
          const response = await fetch(`/api/semesters/${semId}`, {
            method: "DELETE",
            headers: { "Authorization": token },
          });
          const data = await response.json();
          if (data.success) {
            setSavedSemesters(data.semesters);
            setActionMessage({ type: "success", text: "Semester permanently deleted from database." });
          }
        } catch (err) {
          console.error("Failed to delete from database:", err);
        }
      }
    }
  };

  const renameCgpaSemester = (semId: string, name: string) => {
    setCgpaSemesters(prev =>
      prev.map(s => s.id === semId ? { ...s, semesterName: name } : s)
    );
  };

  const addCgpaCourse = (semId: string) => {
    const nextId = String(Date.now() + Math.random());
    setCgpaSemesters(prev =>
      prev.map(s => {
        if (s.id === semId) {
          return {
            ...s,
            courses: [...s.courses, { id: nextId, name: "", score: "", grade: "", units: 3 }]
          };
        }
        return s;
      })
    );
  };

  const removeCgpaCourse = (semId: string, courseId: string) => {
    setCgpaSemesters(prev =>
      prev.map(s => {
        if (s.id === semId) {
          if (s.courses.length <= 1) return s;
          return {
            ...s,
            courses: s.courses.filter(c => c.id !== courseId)
          };
        }
        return s;
      })
    );
  };

  const handleCgpaCourseChange = (semId: string, courseId: string, field: keyof Course, value: any) => {
    setCgpaSemesters(prev =>
      prev.map(s => {
        if (s.id === semId) {
          return {
            ...s,
            courses: s.courses.map(course => {
              if (course.id === courseId) {
                const updated = { ...course, [field]: value };
                if (field === "score") {
                  const grade = getGradeFromScore(value);
                  if (grade !== "") {
                    updated.grade = grade;
                  }
                }
                return updated;
              }
              return course;
            })
          };
        }
        return s;
      })
    );
  };

  const saveCgpaSemesterToHistory = async (semId: string) => {
    if (!token) {
      setActionMessage({ type: "error", text: "Please sign in or register to save your GPA data." });
      return;
    }

    const sem = cgpaSemesters.find(s => s.id === semId);
    if (!sem) return;

    const stats = activeCgpaStats.semestersStats.find(st => st.id === semId);
    if (!stats || stats.filled === 0) {
      setActionMessage({ type: "error", text: "Please enter at least one course with a grade to save." });
      return;
    }

    setSaveLoading(true);
    setActionMessage(null);

    const isMockId = sem.id.startsWith("sem-");

    const payload = {
      id: isMockId ? undefined : sem.id,
      semesterName: sem.semesterName.trim() || "Semester Details",
      courses: sem.courses.filter(c => c.grade !== ""),
      gpa: stats.gpa,
      totalUnits: stats.totalUnits,
      totalPoints: stats.totalPoints,
    };

    try {
      const response = await fetch("/api/semesters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setSavedSemesters(data.semesters);
        setActionMessage({
          type: "success",
          text: `"${sem.semesterName}" details saved successfully!`,
        });
      } else {
        setActionMessage({ type: "error", text: data.message || "Failed to save calculation." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "Error communicating with the database." });
    } finally {
      setSaveLoading(false);
    }
  };

  const saveAllCgpaSemestersToHistory = async () => {
    if (!token) {
      setActionMessage({ type: "error", text: "Please sign in or register to save your semesters to history." });
      return;
    }

    const filledSemesters = cgpaSemesters.filter((s, idx) => {
      const stats = activeCgpaStats.semestersStats[idx];
      return stats && stats.filled > 0;
    });

    if (filledSemesters.length === 0) {
      setActionMessage({ type: "error", text: "Please enter at least one course with a grade to save." });
      return;
    }

    setSaveLoading(true);
    setActionMessage(null);
    let successCount = 0;

    try {
      for (const sem of filledSemesters) {
        const stats = activeCgpaStats.semestersStats.find(st => st.id === sem.id);
        if (!stats) continue;

        const isMockId = sem.id.startsWith("sem-");

        const payload = {
          id: isMockId ? undefined : sem.id,
          semesterName: sem.semesterName.trim() || "Semester",
          courses: sem.courses.filter(c => c.grade !== ""),
          gpa: stats.gpa,
          totalUnits: stats.totalUnits,
          totalPoints: stats.totalPoints,
        };

        const response = await fetch("/api/semesters", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token,
          },
          body: JSON.stringify(payload),
        });
        
        const resData = await response.json();
        if (resData.success) {
          setSavedSemesters(resData.semesters);
          successCount++;
        }
      }

      if (successCount > 0) {
        setActionMessage({
          type: "success",
          text: `Successfully saved ${successCount} semesters to your Cloud History Log!`,
        });
      } else {
        setActionMessage({ type: "error", text: "Failed to store semesters." });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: "Error communicating with the database." });
    } finally {
      setSaveLoading(false);
    }
  };

  const resetCgpaCalculator = () => {
    if (confirm("Are you sure you want to reset the CGPA calculator? This will clear all semesters and courses locally.")) {
      setCgpaSemesters([
        {
          id: "sem-1",
          semesterName: "Semester 1",
          courses: [
            { id: "c1-1", name: "", score: "", grade: "", units: 3 },
            { id: "c1-2", name: "", score: "", grade: "", units: 3 },
            { id: "c1-3", name: "", score: "", grade: "", units: 2 },
            { id: "c1-4", name: "", score: "", grade: "", units: 3 },
          ]
        },
        {
          id: "sem-2",
          semesterName: "Semester 2",
          courses: [
            { id: "c2-1", name: "", score: "", grade: "", units: 3 },
            { id: "c2-2", name: "", score: "", grade: "", units: 3 },
            { id: "c2-3", name: "", score: "", grade: "", units: 2 },
            { id: "c2-4", name: "", score: "", grade: "", units: 3 },
          ]
        }
      ]);
      setActionMessage({ type: "success", text: "CGPA calculator has been reset." });
    }
  };

  // Feedback Messages classification helper
  const getFeedbackMessage = (gpaVal: number) => {
    if (gpaVal <= 0) return null;

    if (scale === 5) {
      if (gpaVal >= 4.50) {
        return {
          class: "First Class",
          message: "excellent keep it there ",
          colorClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          iconColor: "text-emerald-500",
        };
      } else if (gpaVal >= 3.50) {
        return {
          class: "Second Class Upper",
          message: "keep up the good work",
          colorClass: "bg-blue-50 text-blue-800 border-blue-200",
          iconColor: "text-blue-500",
        };
      } else if (gpaVal >= 2.50) {
        return {
          class: "Second Class Lower",
          message: "you are doing great",
          colorClass: "bg-amber-50 text-amber-800 border-amber-200",
          iconColor: "text-amber-500",
        };
      } else {
        return {
          class: "Third Class & Below",
          message: "keep trying ur best",
          colorClass: "bg-rose-50 text-rose-800 border-rose-200",
          iconColor: "text-rose-500",
        };
      }
    } else {
      // 4.0 US Scale thresholds equivalent
      if (gpaVal >= 3.60) {
        return {
          class: "First Class (Honors)",
          message: "excellent keep it there ",
          colorClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
          iconColor: "text-emerald-500",
        };
      } else if (gpaVal >= 3.00) {
        return {
          class: "Second Class Upper (Honors)",
          message: "keep up the good work",
          colorClass: "bg-blue-50 text-blue-800 border-blue-200",
          iconColor: "text-blue-500",
        };
      } else if (gpaVal >= 2.50) {
        return {
          class: "Second Class Lower (Honors)",
          message: "you are doing great",
          colorClass: "bg-amber-50 text-amber-800 border-amber-200",
          iconColor: "text-amber-500",
        };
      } else {
        return {
          class: "Third Class & Below",
          message: "keep trying ur best",
          colorClass: "bg-rose-50 text-rose-800 border-rose-200",
          iconColor: "text-rose-500",
        };
      }
    }
  };

  const activeGPAFeedback = getFeedbackMessage(currentGPAStats.gpa);
  const activeCgpaFeedback = getFeedbackMessage(activeCgpaStats.cgpa);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-blue-100 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-sm shadow-blue-200">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 id="app-title" className="text-xl font-extrabold text-blue-900 tracking-tight">
                Abiodun's GPA calculator app
              </h1>
              <p className="text-xs text-blue-500 font-medium sm:block hidden">
                Professional Academic Performance Tracker
              </p>
            </div>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm uppercase">
                  {user.username.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs text-blue-400 font-semibold leading-none">Logged in as</p>
                  <p className="text-sm font-bold text-blue-900 leading-tight">{user.fullname}</p>
                </div>
              </div>
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl transition-all duration-200 font-medium text-sm cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-medium">
              Guest Session
            </div>
          )}
        </div>
      </header>

      {/* CORE MAIN AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user ? (
          /* AUTHENTICATION VIEW */
          <div className="max-w-md mx-auto my-8 animate-fade-in">
            <div className="bg-white rounded-3xl border border-blue-100 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-8 text-white text-center">
                <div className="inline-flex bg-white/10 p-3 rounded-2xl mb-4 backdrop-blur-md">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black">Abiodun's GPA calculator app</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Track, analyze, and store your semester GPAs and cumulative CGPA.
                </p>
              </div>

              <div className="p-8">
                {/* Auth view toggle */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                  <button
                    id="toggle-login"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      authMode === "login"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    id="toggle-signup"
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      authMode === "signup"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Status Banners */}
                {authError && (
                  <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}
                {authSuccess && (
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-800 text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {/* LOGIN FORM */}
                {authMode === "login" ? (
                  <form onSubmit={handleLoginSubmit} id="login-form" className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <UserIcon className="w-5 h-5" />
                        </span>
                        <input
                          type="text"
                          name="username"
                          id="login-username"
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-200 text-sm font-medium focus:bg-white"
                          placeholder="johndoe"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Lock className="w-5 h-5" />
                        </span>
                        <input
                          type="password"
                          name="password"
                          id="login-password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-200 text-sm font-medium focus:bg-white"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Remember my username</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      id="submit-login"
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-200 transition-all duration-200 cursor-pointer"
                    >
                      Log In to Calculator
                    </button>
                  </form>
                ) : (
                  /* SIGNUP FORM */
                  <form onSubmit={handleSignupSubmit} id="signup-form" className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <UserIcon className="w-5 h-5" />
                        </span>
                        <input
                          type="text"
                          name="fullname"
                          id="signup-fullname"
                          autoComplete="name"
                          value={fullname}
                          onChange={(e) => setFullname(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-200 text-sm font-medium focus:bg-white"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Mail className="w-5 h-5" />
                        </span>
                        <input
                          type="email"
                          name="email"
                          id="signup-email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-200 text-sm font-medium focus:bg-white"
                          placeholder="johndoe@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <UserIcon className="w-5 h-5" />
                        </span>
                        <input
                          type="text"
                          name="username"
                          id="signup-username"
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-200 text-sm font-medium focus:bg-white"
                          placeholder="johndoe"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Create Password
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Lock className="w-5 h-5" />
                        </span>
                        <input
                          type="password"
                          name="password"
                          id="signup-password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-200 text-sm font-medium focus:bg-white"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="submit-signup"
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-200 transition-all duration-200 cursor-pointer"
                    >
                      Register Account
                    </button>
                  </form>
                )}
                
                {/* Guest sandbox option */}
                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400">
                    Your password choice can be stored by the browser upon submitting. 
                    Logging out gives you options to reuse saved passwords.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* WORKSPACE (LOGGED IN VIEW) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* LEFT WORKSPACE: GPA / CGPA CALCULATOR CARD */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-blue-100 shadow-md p-6 sm:p-8 relative">
                
                {/* Mode Selector and Scale Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-blue-50 gap-4">
                  {/* Segmented controls GPA vs CGPA */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
                    <button
                      id="tab-gpa"
                      onClick={() => setActiveTab("gpa")}
                      className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        activeTab === "gpa"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      GPA Calculator
                    </button>
                    <button
                      id="tab-cgpa"
                      onClick={() => setActiveTab("cgpa")}
                      className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        activeTab === "cgpa"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      CGPA Calculator
                    </button>
                  </div>

                  {/* Grading Scale selector */}
                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center">
                      <Info className="w-3.5 h-3.5 mr-1" />
                      Grading Scale:
                    </span>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button
                        id="scale-5"
                        onClick={() => setScale(5)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          scale === 5 
                            ? "bg-white text-blue-600 shadow-xs" 
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        5.0 Scale
                      </button>
                      <button
                        id="scale-4"
                        onClick={() => setScale(4)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          scale === 4 
                            ? "bg-white text-blue-600 shadow-xs" 
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        4.0 Scale
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status or Success Banners */}
                {actionMessage && (
                  <div className={`mt-4 p-4 rounded-2xl border flex items-start space-x-3 text-sm ${
                    actionMessage.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                      : "bg-rose-50 text-rose-800 border-rose-100"
                  }`}>
                    {actionMessage.type === "success" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <span>{actionMessage.text}</span>
                  </div>
                )}

                {/* TAB 1: GPA CALCULATOR WORKSPACE */}
                {activeTab === "gpa" && (
                  <div className="mt-6 space-y-6">
                    {/* Semester metadata inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/40 p-4 rounded-2xl border border-blue-50">
                      <div>
                        <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
                          Semester Label
                        </label>
                        <input
                          type="text"
                          id="semester-name-input"
                          value={semesterName}
                          onChange={(e) => setSemesterName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-xl text-sm font-semibold focus:border-blue-500 text-slate-800"
                          placeholder="e.g. Year 1 - 1st Semester"
                        />
                      </div>
                      <div className="flex flex-col justify-end text-right">
                        <p className="text-xs text-blue-500 font-medium">Editing Status</p>
                        <p className="text-sm font-bold text-blue-900 mt-1">
                          {editingSemesterId ? (
                            <span className="inline-flex items-center text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-100">
                              <span className="w-2 h-2 bg-amber-500 rounded-full mr-1.5 animate-pulse"></span>
                              Updating Saved Record
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>
                              New Record Session
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Courses Grid List */}
                    <div className="space-y-3">
                      <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="col-span-4">Course Code / Name</div>
                        <div className="col-span-3">Score (0 - 100)</div>
                        <div className="col-span-3">Grade Point</div>
                        <div className="col-span-1.5 text-center">Credit Units</div>
                        <div className="col-span-0.5"></div>
                      </div>

                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {courses.map((course, index) => (
                          <div 
                            key={course.id} 
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 md:p-2 border border-slate-100 hover:border-blue-200 md:hover:border-slate-200 rounded-2xl md:rounded-xl transition-all duration-150 items-center shadow-xs"
                          >
                            {/* Course Title */}
                            <div className="col-span-4">
                              <label className="block md:hidden text-xs font-bold text-slate-400 uppercase mb-1">
                                Course Title
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-mono text-xs">
                                  #{index + 1}
                                </span>
                                <input
                                  type="text"
                                  value={course.name}
                                  onChange={(e) => handleCourseChange(course.id, "name", e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white"
                                  placeholder="e.g. MTH101"
                                />
                              </div>
                            </div>

                            {/* Score Input */}
                            <div className="col-span-3">
                              <label className="block md:hidden text-xs font-bold text-slate-400 uppercase mb-1">
                                Score (Optional)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={course.score}
                                onChange={(e) => handleCourseChange(course.id, "score", e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-center focus:bg-white text-blue-950 font-mono"
                                placeholder="0-100"
                              />
                            </div>

                            {/* Grade Output / Input */}
                            <div className="col-span-3">
                              <label className="block md:hidden text-xs font-bold text-slate-400 uppercase mb-1">
                                Grade
                              </label>
                              <select
                                value={course.grade}
                                onChange={(e) => handleCourseChange(course.id, "grade", e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center text-blue-800 focus:bg-white cursor-pointer"
                              >
                                <option value="">Select Grade</option>
                                <option value="A">Grade A ({scale === 5 ? "5.0" : "4.0"} Pts)</option>
                                <option value="B">Grade B ({scale === 5 ? "4.0" : "3.0"} Pts)</option>
                                <option value="C">Grade C ({scale === 5 ? "3.0" : "2.0"} Pts)</option>
                                <option value="D">Grade D ({scale === 5 ? "2.0" : "1.0"} Pts)</option>
                                {scale === 5 && <option value="E">Grade E (1.0 Pts)</option>}
                                <option value="F">Grade F (0.0 Pts)</option>
                              </select>
                            </div>

                            {/* Credit Units */}
                            <div className="col-span-1.5">
                              <label className="block md:hidden text-xs font-bold text-slate-400 uppercase mb-1 text-center">
                                Credit Units
                              </label>
                              <select
                                value={course.units}
                                onChange={(e) => handleCourseChange(course.id, "units", Number(e.target.value))}
                                className="w-full py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center text-slate-700 focus:bg-white cursor-pointer font-mono"
                              >
                                {[1, 2, 3, 4, 5, 6].map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>

                            {/* Delete Button */}
                            <div className="col-span-0.5 text-right">
                              <button
                                type="button"
                                onClick={() => removeCourseRow(course.id)}
                                disabled={courses.length <= 1}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                                title="Remove row"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add/Clear controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          id="add-course-row"
                          onClick={addCourseRow}
                          className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer border border-blue-100"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Course Row</span>
                        </button>

                        <button
                          type="button"
                          id="clear-calc"
                          onClick={clearCalculator}
                          className="flex items-center space-x-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-slate-200"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Clear / Reset</span>
                        </button>
                      </div>

                      {/* Save button */}
                      <button
                        type="button"
                        id="save-semester"
                        onClick={saveSemesterToHistory}
                        disabled={saveLoading || currentGPAStats.filledRows === 0}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {saveLoading 
                            ? "Saving..." 
                            : editingSemesterId 
                              ? "Update Saved Semester" 
                              : "Save to History Log"
                          }
                        </span>
                      </button>
                    </div>

                    {/* LIVE GPA RESULTS PRESENTATION */}
                    <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-3xl p-6 shadow-md shadow-blue-900/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="space-y-1">
                        <h4 className="text-blue-200 text-xs font-bold uppercase tracking-wider">
                          Active Semester Summary
                        </h4>
                        <p className="text-xl font-black text-white">{semesterName || "Semester Details"}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs text-blue-100">
                          <span className="font-semibold">
                            Total Units: <strong className="text-white font-mono">{currentGPAStats.totalUnits}</strong>
                          </span>
                          <span className="text-blue-400">•</span>
                          <span className="font-semibold">
                            Quality Points: <strong className="text-white font-mono">{currentGPAStats.totalPoints}</strong>
                          </span>
                          <span className="text-blue-400">•</span>
                          <span className="font-semibold">
                            Active Courses: <strong className="text-white font-mono">{currentGPAStats.filledRows}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/10 shrink-0">
                        <div className="text-right">
                          <p className="text-blue-200 text-xs font-semibold leading-none">Calculated GPA</p>
                          <p className="text-4xl font-black font-mono tracking-tight text-white mt-1">
                            {currentGPAStats.gpa.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-blue-600 text-white p-2.5 rounded-xl">
                          <Award className="w-8 h-8" />
                        </div>
                      </div>
                    </div>

                    {/* CLASSIFICATION BANNER */}
                    {activeGPAFeedback && (
                      <div className={`p-5 rounded-2xl border flex items-start space-x-4 transition-all duration-300 ${activeGPAFeedback.colorClass}`}>
                        <div className="bg-white/95 p-2 rounded-xl shadow-xs shrink-0">
                          <Sparkles className={`w-6 h-6 ${activeGPAFeedback.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide opacity-80 leading-none">
                            Academic Standing
                          </p>
                          <p className="text-lg font-black tracking-tight mt-0.5">
                            {activeGPAFeedback.class}
                          </p>
                          <p className="text-sm font-medium mt-1 select-none">
                            &ldquo;{activeGPAFeedback.message}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: CGPA CALCULATOR WORKSPACE */}
                {activeTab === "cgpa" && (
                  <div className="mt-6 space-y-6">
                    <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 text-blue-950 text-xs leading-relaxed flex items-start space-x-3">
                      <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-sm font-extrabold text-blue-900 mb-0.5">Interactive CGPA Calculator Workspace</strong>
                        Compute your Cumulative GPA (CGPA) dynamically over multiple semesters. Customize each semester's course list, select grades or type in scores (which automatically map to grades). Your CGPA updates instantly with live class feedback beneath!
                      </div>
                    </div>

                    {/* Semesters list */}
                    <div className="space-y-6">
                      {cgpaSemesters.map((s, idx) => {
                        const stats = activeCgpaStats.semestersStats[idx];
                        return (
                          <div 
                            key={s.id} 
                            className="bg-white rounded-3xl border border-slate-100 p-6 shadow-3xs hover:shadow-2xs transition-all duration-200 space-y-4"
                          >
                            {/* Semester Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-50">
                              <div className="flex items-center space-x-2.5">
                                <span className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-lg font-black text-xs font-mono shadow-xs">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={s.semesterName}
                                  onChange={(e) => renameCgpaSemester(s.id, e.target.value)}
                                  className="font-extrabold text-slate-800 text-sm focus:outline-hidden border-b border-dashed border-slate-300 focus:border-blue-500 bg-transparent px-1 py-0.5 rounded-sm max-w-[160px] sm:max-w-xs transition-all"
                                  placeholder={`Semester ${idx + 1}`}
                                />
                              </div>

                              {/* Calculated Semester GPA shown as badge */}
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
                                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Semester GPA</span>
                                  <span className="text-sm font-extrabold font-mono text-blue-900 leading-none">
                                    {stats ? stats.gpa.toFixed(2) : "0.00"}
                                  </span>
                                </div>

                                {token && (
                                  <button
                                    type="button"
                                    onClick={() => saveCgpaSemesterToHistory(s.id)}
                                    disabled={saveLoading || !stats || stats.filled === 0}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 border border-emerald-100 text-emerald-700 font-extrabold text-[11px] rounded-xl transition-all cursor-pointer flex items-center space-x-1"
                                    title="Save this semester's GPA data to History Log"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save to History</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => removeCgpaSemester(s.id)}
                                  disabled={cgpaSemesters.length <= 1}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Remove entire semester"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Course rows grid for this semester */}
                            <div className="space-y-2">
                              {/* Header labels */}
                              <div className="hidden sm:grid grid-cols-12 gap-3 px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                <div className="col-span-5">Course Title / Code</div>
                                <div className="col-span-2 text-center">Score (Optional)</div>
                                <div className="col-span-2">Grade</div>
                                <div className="col-span-2 text-center">Credit Units</div>
                                <div className="col-span-1"></div>
                              </div>

                              {/* Rows */}
                              <div className="space-y-2 divide-y sm:divide-y-0 divide-slate-100">
                                {s.courses.map((course, cIdx) => (
                                  <div
                                    key={course.id}
                                    className="grid grid-cols-12 gap-2 sm:gap-3 items-center pt-2 sm:pt-0 pb-2 sm:pb-0 border-b sm:border-b-0 border-slate-50 last:border-b-0"
                                  >
                                    {/* Course Name Input */}
                                    <div className="col-span-12 sm:col-span-5">
                                      <input
                                        type="text"
                                        value={course.name}
                                        onChange={(e) => handleCgpaCourseChange(s.id, course.id, "name", e.target.value)}
                                        placeholder={`Course ${cIdx + 1} Name`}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 text-slate-800 transition-all"
                                      />
                                    </div>

                                    {/* Score Input */}
                                    <div className="col-span-4 sm:col-span-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={course.score}
                                        onChange={(e) => handleCgpaCourseChange(s.id, course.id, "score", e.target.value)}
                                        placeholder="Score"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 text-slate-800 transition-all font-mono text-center"
                                      />
                                    </div>

                                    {/* Grade Dropdown */}
                                    <div className="col-span-4 sm:col-span-2">
                                      <select
                                        value={course.grade}
                                        onChange={(e) => handleCgpaCourseChange(s.id, course.id, "grade", e.target.value)}
                                        className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 text-slate-800 transition-all"
                                      >
                                        <option value="">Grade</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                        {scale === 5 && <option value="E">E</option>}
                                        <option value="F">F</option>
                                      </select>
                                    </div>

                                    {/* Credit Units Dropdown */}
                                    <div className="col-span-3 sm:col-span-2">
                                      <select
                                        value={course.units}
                                        onChange={(e) => handleCgpaCourseChange(s.id, course.id, "units", Number(e.target.value))}
                                        className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 text-slate-800 transition-all text-center"
                                      >
                                        {[1, 2, 3, 4, 5, 6].map((u) => (
                                          <option key={u} value={u}>
                                            {u} Unit{u > 1 ? "s" : ""}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Delete Course Row */}
                                    <div className="col-span-1 sm:col-span-1 text-center">
                                      <button
                                        type="button"
                                        onClick={() => removeCgpaCourse(s.id, course.id)}
                                        disabled={s.courses.length <= 1}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                                        title="Delete Course"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Semester controls */}
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => addCgpaCourse(s.id)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Course</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grand bottom controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          id="add-cgpa-semester"
                          onClick={addCgpaSemester}
                          className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Semester</span>
                        </button>

                        <button
                          type="button"
                          id="reset-cgpa-calc"
                          onClick={resetCgpaCalculator}
                          className="flex items-center space-x-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer border border-slate-200"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset Calculator</span>
                        </button>
                      </div>

                      {token && (
                        <button
                          type="button"
                          onClick={saveAllCgpaSemestersToHistory}
                          disabled={saveLoading}
                          className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Save All to Cloud History</span>
                        </button>
                      )}
                    </div>

                    {/* GRAND CGPA RESULTS DISPLAY */}
                    <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-3xl p-6 shadow-md shadow-blue-900/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="space-y-1">
                        <h4 className="text-blue-200 text-xs font-bold uppercase tracking-wider">
                          Cumulative CGPA Results Summary
                        </h4>
                        <p className="text-xl font-black text-white">All Active Semesters Combined</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs text-blue-100">
                          <span className="font-semibold">
                            Total Combined Units: <strong className="text-white font-mono">{activeCgpaStats.totalUnits}</strong>
                          </span>
                          <span className="text-blue-400">•</span>
                          <span className="font-semibold">
                            Quality Points: <strong className="text-white font-mono">{activeCgpaStats.totalPoints}</strong>
                          </span>
                          <span className="text-blue-400">•</span>
                          <span className="font-semibold">
                            Total Semesters: <strong className="text-white font-mono">{cgpaSemesters.length}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/10 shrink-0">
                        <div className="text-right">
                          <p className="text-blue-200 text-xs font-semibold leading-none">Cumulative CGPA</p>
                          <p className="text-4xl font-black font-mono tracking-tight text-white mt-1">
                            {activeCgpaStats.cgpa.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-blue-600 text-white p-2.5 rounded-xl">
                          <Award className="w-8 h-8" />
                        </div>
                      </div>
                    </div>

                    {/* CLASSIFICATION CGPA FEEDBACK */}
                    {activeCgpaFeedback && (
                      <div className={`p-5 rounded-2xl border flex items-start space-x-4 transition-all duration-300 ${activeCgpaFeedback.colorClass}`}>
                        <div className="bg-white/95 p-2 rounded-xl shadow-xs shrink-0">
                          <Sparkles className={`w-6 h-6 ${activeCgpaFeedback.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide opacity-80 leading-none">
                            Academic Standing
                          </p>
                          <p className="text-lg font-black tracking-tight mt-0.5">
                            {activeCgpaFeedback.class}
                          </p>
                          <p className="text-sm font-medium mt-1 select-none">
                            &ldquo;{activeCgpaFeedback.message}&rdquo;
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDEBAR: HISTORY LOG */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl border border-blue-100 shadow-md p-6 sm:p-8 flex flex-col h-full">
                <div className="flex items-center justify-between pb-4 border-b border-blue-50">
                  <div className="flex items-center space-x-2">
                    <History className="w-5 h-5 text-blue-600" />
                    <h3 className="font-extrabold text-slate-800 text-base">Saved History Log</h3>
                  </div>
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100 font-mono">
                    {savedSemesters.length} Saved
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-medium">Retrieving saved data...</p>
                  </div>
                ) : savedSemesters.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <div className="bg-blue-50/50 p-4 rounded-2xl mb-3 border border-blue-50/20">
                      <UserCheck className="w-8 h-8 text-blue-400" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-500">History log is empty</h4>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto mt-1">
                      Perform calculations on the left, then click &ldquo;Save to History Log&rdquo; to store records in the database.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] py-4 pr-1">
                    {savedSemesters.map(semester => (
                      <div
                        key={semester.id}
                        onClick={() => loadSemesterToEdit(semester)}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left relative group select-none ${
                          editingSemesterId === semester.id
                            ? "bg-blue-50/60 border-blue-300 shadow-xs"
                            : "bg-white border-slate-200/75 hover:bg-slate-50/50 hover:border-blue-200 hover:shadow-2xs"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 pr-6 truncate">
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-900 transition-colors truncate">
                              {semester.semesterName}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-400 font-mono">
                              {new Date(semester.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                          
                          {/* Trash button */}
                          <button
                            type="button"
                            onClick={(e) => deleteSemesterFromHistory(semester.id, e)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg shrink-0 transition-all cursor-pointer"
                            title="Delete semester"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Metrics footer */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                          <span className="text-slate-400 font-medium">
                            {semester.courses?.length || 0} courses • {semester.totalUnits} units
                          </span>
                          <span className="bg-blue-600 text-white font-extrabold font-mono px-2.5 py-0.5 rounded-md leading-relaxed shadow-3xs">
                            {Number(semester.gpa).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center space-x-1 font-medium">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cloud persistence storage active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER & CONTACT INFORMATION */}
      <footer className="bg-white border-t border-blue-50 mt-12 py-8 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-sm font-bold text-blue-900">
              Abiodun's GPA calculator
            </p>
            <p className="text-xs text-slate-400 font-medium">
              &copy; 2026 Academic Performance Manager. Built with React, Tailwind and Express.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl max-w-md w-full md:w-auto text-xs space-y-2.5">
            <p className="text-[11px] font-bold text-blue-800 uppercase tracking-widest leading-none">
              Contact / Developer Details
            </p>
            <div className="space-y-1.5 font-medium text-slate-600">
              <p className="flex items-center justify-center md:justify-start">
                <span className="font-semibold text-slate-800 mr-1.5">Name:</span> 
                Ajayi Abiodun Toluwalase
              </p>
              <p className="flex items-center justify-center md:justify-start">
                <span className="font-semibold text-slate-800 mr-1.5">Email:</span> 
                <a href="mailto:ajayiabiodun462@gmail.com" className="text-blue-600 hover:underline">
                  ajayiabiodun462@gmail.com
                </a>
              </p>
              <p className="flex items-center justify-center md:justify-start">
                <span className="font-semibold text-slate-800 mr-1.5">Phone:</span> 
                <a href="tel:07045937774" className="text-blue-600 hover:underline font-mono">
                  07045937774
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
