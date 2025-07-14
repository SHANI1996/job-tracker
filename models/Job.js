const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  learnerEmail: {
    type: String,
    required: true,
    match: [/.+\@.+\..+/, "Please enter a valid email address"]
  },
  jobTitle: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Applied", "Interview", "Rejected"],
    default: "Applied"
  },
  employerNote: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Job", jobSchema);
