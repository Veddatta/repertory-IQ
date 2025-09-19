console.log("📊 Totality analysis page loaded");

let repertory = [];

// Load repertory data
async function loadRepertory() {
  const REPERTORY_PATHS = [
    './data/repertory_master.json',
    'data/repertory_master.json',
    'repertory_master.json'
  ];

  for (let path of REPERTORY_PATHS) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      repertory = await res.json();
      console.log(`✅ Loaded ${repertory.length} rubrics for totality analysis`);
      return;
    } catch (err) {
      console.warn(`Failed to load from ${path}:`, err);
    }
  }
  
  console.error("Error loading repertory data");
  showError("Failed to load repertory data. Please refresh the page.");
}

// Show error message
function showError(message) {
  const resultsDiv = document.getElementById("totalityResults");
  if (resultsDiv) {
    resultsDiv.innerHTML = `<div class="error-message">⚠️ ${message}</div>`;
  }
}

// Show loading indicator
function showLoading(show = true) {
  const loadingDiv = document.getElementById("loadingIndicator");
  if (loadingDiv) {
    loadingDiv.style.display = show ? 'block' : 'none';
  }
}

// Parse and clean symptoms input
function parseSymptoms(input) {
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(line => line.length > 2); // Filter out very short entries
}

// Normalize text for searching
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

// Find matching rubrics for a symptom
function findMatchingRubrics(symptom) {
  const normalizedSymptom = normalize(symptom);
  const words = normalizedSymptom.split(/\s+/).filter(word => word.length > 2);
  
  return repertory.filter(rubric => {
    const normalizedRubric = normalize(rubric.r || rubric.rubric || '');
    return words.some(word => normalizedRubric.includes(word));
  });
}

// Calculate remedy scores based on totality
function calculateRemedyTotality(symptoms, includeGrades = true) {
  const remedyScores = new Map();
  const remedyRubrics = new Map(); // Track which rubrics contributed to each remedy
  const symptomMatches = []; // Track matches for each symptom
  
  symptoms.forEach((symptom, index) => {
    const matches = findMatchingRubrics(symptom);
    symptomMatches.push({
      symptom,
      matches: matches.length,
      rubrics: matches.slice(0, 5) // Keep top 5 matches for display
    });
    
    matches.forEach(rubric => {
      const remedies = rubric.m || rubric.remedies || [];
      remedies.forEach(remedy => {
        // Parse remedy grade if present (e.g., "Acon3" -> remedy: "Acon", grade: 3)
        let remedyName = remedy;
        let grade = 1;
        
        if (includeGrades && typeof remedy === 'string') {
          const gradeMatch = remedy.match(/^([A-Za-z-]+)(\d+)$/);
          if (gradeMatch) {
            remedyName = gradeMatch[1];
            grade = parseInt(gradeMatch[2]);
          }
        }
        
        // Calculate score (higher grade = higher score)
        const currentScore = remedyScores.get(remedyName) || 0;
        remedyScores.set(remedyName, currentScore + grade);
        
        // Track rubrics for this remedy
        if (!remedyRubrics.has(remedyName)) {
          remedyRubrics.set(remedyName, new Set());
        }
        remedyRubrics.get(remedyName).add(rubric.r || rubric.rubric);
      });
    });
  });
  
  return {
    scores: remedyScores,
    rubrics: remedyRubrics,
    symptomMatches
  };
}

// Display totality analysis results
function displayTotalityResults(symptoms, analysis, showDetails) {
  const resultsDiv = document.getElementById("totalityResults");
  if (!resultsDiv) return;
  
  const { scores, rubrics, symptomMatches } = analysis;
  
  // Convert to sorted array
  const sortedRemedies = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Show top 20 remedies
  
  let html = `
    <div class="analysis-summary">
      <h3>📊 Totality Analysis Results</h3>
      <p><strong>Symptoms analyzed:</strong> ${symptoms.length}</p>
      <p><strong>Top remedies found:</strong> ${sortedRemedies.length}</p>
    </div>
  `;
  
  if (sortedRemedies.length === 0) {
    html += `
      <div class="no-results">
        <h4>No matching remedies found</h4>
        <p>Try rephrasing your symptoms or using more general terms.</p>
      </div>
    `;
  } else {
    html += `
      <div class="remedy-ranking">
        <h4>🏆 Top Remedies by Totality Score</h4>
        <div class="remedies-grid">
    `;
    
    sortedRemedies.forEach(([remedy, score], index) => {
      const remedyRubricsList = Array.from(rubrics.get(remedy) || []);
      const coverageCount = remedyRubricsList.length;
      
      html += `
        <div class="remedy-card ${index < 3 ? 'top-remedy' : ''}">
          <div class="remedy-header">
            <span class="remedy-rank">#${index + 1}</span>
            <strong class="remedy-name">${remedy}</strong>
            <span class="remedy-score">${score} pts</span>
          </div>
          <div class="remedy-stats">
            <small>Coverage: ${coverageCount} rubric${coverageCount !== 1 ? 's' : ''}</small>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  if (showDetails && symptomMatches.length > 0) {
    html += `
      <div class="detailed-breakdown">
        <h4>🔍 Detailed Symptom Analysis</h4>
        <div class="symptoms-breakdown">
    `;
    
    symptomMatches.forEach((symptomData, index) => {
      html += `
        <div class="symptom-analysis">
          <div class="symptom-header">
            <strong>Symptom ${index + 1}:</strong> ${symptomData.symptom}
            <span class="match-count">${symptomData.matches} match${symptomData.matches !== 1 ? 'es' : ''}</span>
          </div>
      `;
      
      if (symptomData.rubrics.length > 0) {
        html += `<div class="matching-rubrics">`;
        symptomData.rubrics.slice(0, 3).forEach(rubric => {
          const rubricText = rubric.r || rubric.rubric || 'Unknown rubric';
          const remedies = rubric.m || rubric.remedies || [];
          html += `
            <div class="rubric-match">
              <small><strong>Rubric:</strong> ${rubricText}</small><br>
              <small><strong>Remedies:</strong> ${remedies.slice(0, 8).join(', ')}${remedies.length > 8 ? '...' : ''}</small>
            </div>
          `;
        });
        html += `</div>`;
      }
      
      html += `</div>`;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  resultsDiv.innerHTML = html;
}

// Main analysis function
async function analyzeTotality() {
  const inputEl = document.getElementById("symptomsInput");
  const includeGradesEl = document.getElementById("includeGrades");
  const showDetailsEl = document.getElementById("showDetails");
  
  if (!inputEl) {
    showError("Input element not found. Please refresh the page.");
    return;
  }
  
  const input = inputEl.value.trim();
  if (!input) {
    showError("Please enter at least one symptom to analyze.");
    return;
  }
  
  const symptoms = parseSymptoms(input);
  if (symptoms.length === 0) {
    showError("Please enter valid symptoms (each on a new line).");
    return;
  }
  
  if (repertory.length === 0) {
    showError("Repertory data is not loaded yet. Please wait and try again.");
    return;
  }
  
  showLoading(true);
  
  try {
    // Add small delay to show loading indicator
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const includeGrades = includeGradesEl ? includeGradesEl.checked : true;
    const showDetails = showDetailsEl ? showDetailsEl.checked : true;
    
    const analysis = calculateRemedyTotality(symptoms, includeGrades);
    displayTotalityResults(symptoms, analysis, showDetails);
    
  } catch (error) {
    console.error("Analysis error:", error);
    showError("An error occurred during analysis. Please try again.");
  } finally {
    showLoading(false);
  }
}

// Clear all input and results
function clearAll() {
  const inputEl = document.getElementById("symptomsInput");
  const resultsDiv = document.getElementById("totalityResults");
  
  if (inputEl) {
    inputEl.value = "";
    inputEl.focus();
  }
  
  // Clear any stored symptoms
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('totalitySymptoms');
    }
  } catch (e) {
    console.warn('localStorage not available');
  }
  
  updateTotalityCounter();
  
  if (resultsDiv) {
    resultsDiv.innerHTML = `
      <div class="welcome-message">
        <h3>Welcome to Totality Analysis</h3>
        <p>This tool helps you analyze multiple symptoms together to find the most suitable homeopathic remedies based on the totality of symptoms - a core principle in homeopathic prescribing.</p>
        
        <div class="instructions">
          <h4>How to use:</h4>
          <ul>
            <li>Enter each symptom on a separate line</li>
            <li>Use clear, descriptive language</li>
            <li>Include modalities (what makes symptoms better/worse)</li>
            <li>Click "Analyze Totality" to see remedy rankings</li>
            <li>Or use "Add to Totality" buttons from search results</li>
          </ul>
        </div>
      </div>
    `;
  }
}

// Load stored symptoms from localStorage (with error handling)
function loadStoredSymptoms() {
  try {
    if (typeof localStorage === 'undefined') return;
    
    const totalitySymptoms = JSON.parse(localStorage.getItem('totalitySymptoms') || '[]');
    const inputEl = document.getElementById("symptomsInput");
    
    if (inputEl && totalitySymptoms.length > 0) {
      inputEl.value = totalitySymptoms.join('\n');
      showNotification(`Loaded ${totalitySymptoms.length} symptom${totalitySymptoms.length !== 1 ? 's' : ''} from previous searches`, 'info');
    }
  } catch (e) {
    console.warn('Failed to load stored symptoms:', e);
  }
}

// Update totality counter in navigation
function updateTotalityCounter() {
  try {
    if (typeof localStorage === 'undefined') return;
    
    const totalitySymptoms = JSON.parse(localStorage.getItem('totalitySymptoms') || '[]');
    const totalityLink = document.querySelector('nav a[href="totality.html"]');
    
    if (totalityLink) {
      const count = totalitySymptoms.length;
      if (count > 0) {
        totalityLink.innerHTML = `📊 Totality (${count})`;
      } else {
        totalityLink.innerHTML = `📊 Totality`;
      }
    }
  } catch (e) {
    console.warn('Failed to update totality counter:', e);
  }
}

// Show notification
function showNotification(message, type = 'success') {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="close-btn">×</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 4000);
}

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  loadRepertory();
  
  const analyzeBtn = document.getElementById("analyzeBtn");
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", analyzeTotality);
  } else {
    console.warn("⚠️ analyzeBtn not found in HTML");
  }
  
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearAll);
  } else {
    console.warn("⚠️ clearBtn not found in HTML");
  }
  
  // Add keyboard shortcuts
  const inputEl = document.getElementById("symptomsInput");
  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        analyzeTotality();
      }
    });
  }
  
  // Load any stored symptoms
  loadStoredSymptoms();
});