// utils/resumeStrengthChecker.js
// Flow Step 4: "Resume Strength Check — Score ≥ 60% → attend drive"
//
// Scoring breakdown (Total = 100):
//   Skills keywords      → 30 pts
//   Education section    → 20 pts
//   Experience/Projects  → 20 pts
//   Formatting signals   → 15 pts
//   Contact & Social     → 15 pts

const pdfParse = require('pdf-parse');
const fs = require('fs');

// ── Keyword Banks ────────────────────────────────────────────
const TECH_SKILLS = [
  // Programming Languages
  'java', 'python', 'c++', 'javascript', 'typescript', 'c#', 'kotlin', 'swift',
  'php', 'ruby', 'go', 'rust', 'scala', 'r programming',
  // Web
  'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask',
  'html', 'css', 'bootstrap', 'tailwind', 'rest api', 'graphql',
  // Database
  'mysql', 'mongodb', 'postgresql', 'oracle', 'firebase', 'redis', 'sql',
  // Cloud / DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'github', 'jenkins', 'ci/cd',
  // Data / AI
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'data analysis', 'power bi', 'tableau',
  // Core CS
  'data structures', 'algorithms', 'oops', 'operating systems', 'networking',
];

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
  'time management', 'adaptability', 'critical thinking', 'collaboration',
];

const EDUCATION_KEYWORDS = [
  'b.e', 'b.tech', 'bachelor', 'cgpa', 'gpa', 'percentage', 'hsc', 'sslc',
  '10th', '12th', 'engineering', 'computer science', 'information technology',
  'electronics', 'mechanical', 'university', 'college', 'institute',
];

const EXPERIENCE_KEYWORDS = [
  'internship', 'project', 'experience', 'developed', 'implemented', 'designed',
  'built', 'created', 'worked', 'contributed', 'led', 'managed', 'trained',
  'hackathon', 'workshop', 'certification', 'coursera', 'udemy', 'nptel',
];

const FORMAT_KEYWORDS = [
  'objective', 'summary', 'skills', 'education', 'projects', 'experience',
  'achievements', 'certifications', 'activities', 'hobbies', 'references',
  'contact', 'address',
];

const CONTACT_KEYWORDS = [
  'linkedin', 'github', 'email', 'phone', 'mobile', 'portfolio', 'website',
];

// ── Core Scorer ──────────────────────────────────────────────
const scoreKeywords = (text, keywords) => {
  const lowerText = text.toLowerCase();
  let found = 0;
  const matched = [];

  keywords.forEach((kw) => {
    if (lowerText.includes(kw.toLowerCase())) {
      found++;
      matched.push(kw);
    }
  });

  return { found, total: keywords.length, matched };
};

// ── Main Function ─────────────────────────────────────────────
/**
 * Analyzes a PDF resume and returns a score + suggestions.
 * @param {string} filePath  - Absolute path to the uploaded PDF
 * @returns {object}         - { score, breakdown, suggestions, isStrong }
 */
const analyzeResume = async (filePath) => {
  try {
    // 1. Extract text from PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text || '';

    if (text.trim().length < 100) {
      return {
        score: 0,
        breakdown: { skillsScore: 0, educationScore: 0, experienceScore: 0, formattingScore: 0, keywordsScore: 0 },
        suggestions: ['Could not extract text from PDF. Ensure it is not a scanned image.'],
        isStrong: false,
      };
    }

    const suggestions = [];

    // ── 2. Skills Score (30 pts) ─────────────────
    const techMatch  = scoreKeywords(text, TECH_SKILLS);
    const softMatch  = scoreKeywords(text, SOFT_SKILLS);

    let skillsScore = 0;
    // Tech: up to 25 pts (each keyword ~1pt, max 25)
    skillsScore += Math.min(25, techMatch.found * 2);
    // Soft skills: up to 5 pts
    skillsScore += Math.min(5, softMatch.found * 1);
    skillsScore = Math.min(30, skillsScore);

    if (techMatch.found < 5) {
      suggestions.push(`Add more technical skills. Only found: ${techMatch.matched.slice(0, 3).join(', ') || 'none'}.`);
    }
    if (softMatch.found < 2) {
      suggestions.push('Add soft skills (e.g., Leadership, Communication, Teamwork).');
    }

    // ── 3. Education Score (20 pts) ──────────────
    const eduMatch = scoreKeywords(text, EDUCATION_KEYWORDS);
    let educationScore = Math.min(20, eduMatch.found * 3);

    if (!text.toLowerCase().includes('cgpa') && !text.toLowerCase().includes('gpa')) {
      suggestions.push('Mention your CGPA/GPA in the Education section.');
      educationScore = Math.max(0, educationScore - 5);
    }
    if (!text.toLowerCase().includes('10th') && !text.toLowerCase().includes('sslc')) {
      suggestions.push('Include 10th percentage / SSLC details.');
    }
    if (!text.toLowerCase().includes('12th') && !text.toLowerCase().includes('hsc')) {
      suggestions.push('Include 12th percentage / HSC details.');
    }

    // ── 4. Experience / Projects Score (20 pts) ──
    const expMatch = scoreKeywords(text, EXPERIENCE_KEYWORDS);
    let experienceScore = Math.min(20, expMatch.found * 2);

    if (!text.toLowerCase().includes('project')) {
      suggestions.push('Add at least 2-3 academic or personal projects with descriptions.');
      experienceScore = Math.max(0, experienceScore - 8);
    }
    if (!text.toLowerCase().includes('internship')) {
      suggestions.push('Add internship experience if available.');
    }

    // ── 5. Formatting Score (15 pts) ─────────────
    const fmtMatch = scoreKeywords(text, FORMAT_KEYWORDS);
    let formattingScore = Math.min(15, fmtMatch.found * 2);

    const wordCount = text.split(/\s+/).length;
    if (wordCount < 200) {
      suggestions.push('Resume seems too short. Add more details about projects and skills.');
      formattingScore = Math.max(0, formattingScore - 5);
    }
    if (wordCount > 1200) {
      suggestions.push('Resume may be too long. Keep it to 1-2 pages.');
    }
    if (pdfData.numpages > 2) {
      suggestions.push('Reduce to maximum 2 pages for fresher resume.');
      formattingScore = Math.max(0, formattingScore - 3);
    }

    // ── 6. Contact & Social Score (15 pts) ───────
    const contactMatch = scoreKeywords(text, CONTACT_KEYWORDS);
    let keywordsScore = Math.min(15, contactMatch.found * 3);

    if (!text.toLowerCase().includes('linkedin')) {
      suggestions.push('Add your LinkedIn profile URL.');
    }
    if (!text.toLowerCase().includes('github')) {
      suggestions.push('Add your GitHub profile URL to showcase projects.');
    }
    if (!text.match(/\d{10}/)) {
      suggestions.push('Include a 10-digit mobile number.');
    }

    // ── Total Score ───────────────────────────────
    const totalScore = Math.round(
      skillsScore + educationScore + experienceScore + formattingScore + keywordsScore
    );

    const minScore = parseInt(process.env.RESUME_MIN_SCORE) || 60;
    const isStrong = totalScore >= minScore;

    if (!isStrong) {
      suggestions.unshift(
        `⚠️ Your resume score is ${totalScore}/100. Minimum required is ${minScore}/100 to apply for drives.`
      );
    }

    return {
      score: Math.min(100, totalScore),
      breakdown: {
        skillsScore,
        educationScore,
        experienceScore,
        formattingScore,
        keywordsScore,
      },
      suggestions: suggestions.slice(0, 6), // Max 6 suggestions
      isStrong,
    };
  } catch (error) {
    console.error('Resume analysis error:', error.message);
    return {
      score: 0,
      breakdown: { skillsScore: 0, educationScore: 0, experienceScore: 0, formattingScore: 0, keywordsScore: 0 },
      suggestions: ['Resume analysis failed. Please ensure you uploaded a valid PDF.'],
      isStrong: false,
    };
  }
};

module.exports = { analyzeResume };
