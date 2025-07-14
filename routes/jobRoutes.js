const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const nodemailer = require("nodemailer");
const { CohereClient } = require("cohere-ai");
require("dotenv").config();

// Initialize Cohere client
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Extract first name dynamically from email
function extractFirstName(email) {
  const localPart = email.split("@")[0];

 
  const cleaned = localPart.replace(/[^a-zA-Z.\-_]/g, "");

  // Split on common delimiters
  const parts = cleaned.split(/\.|-|_/);

  // Capitalize the first word that looks like a name
  for (const part of parts) {
    const word = part.replace(/[^a-zA-Z]/g, "");
    if (word.length > 2) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  }

  // Fallback to entire localPart if no match found
  return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
}

// Reusable function to send email to learner only
async function sendStatusEmail(job) {
  const learnerEmail = job.learnerEmail;
  const senderEmail = process.env.EMAIL_USER;

  if (learnerEmail === senderEmail) return;

  const learnerName = extractFirstName(learnerEmail);

  const prompt = `Write a short, polite, and professional email starting with \"Hi ${learnerName},\". The applicant applied for the \"${job.jobTitle}\" position. The application status is \"${job.status}\". Employer note: \"${job.employerNote || "No note provided"}\".`;

  const response = await cohere.generate({
    model: "command",
    prompt,
    maxTokens: 150,
    temperature: 0.7,
  });

  const generatedEmail = response.generations[0].text.trim();

  await transporter.sendMail({
    from: senderEmail,
    to: learnerEmail,
    subject: `Update on Your ${job.jobTitle} Application`,
    text: generatedEmail,
  });

  console.log(`Email sent to learner: ${learnerEmail}`);
}

// Create job and notify learner
router.post("/jobs", async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    await sendStatusEmail(job);
    res.status(201).json(job);
  } catch (err) {
    console.error("POST /jobs error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

//Update job and notify learner on status change
router.put("/jobs/:id", async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (req.body.status) await sendStatusEmail(job);
    res.json(job);
  } catch (err) {
    console.error("PUT /jobs/:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// All jobs
router.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.find();
    res.json(jobs);
  } catch (err) {
    console.error("GET /jobs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
