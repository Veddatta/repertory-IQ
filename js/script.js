// UPDATED FOR VERCEL: The URL now points to the /api directory
const AI_FUNCTION_URL = '/api/generate-rubric';

// Corrected paths for your local setup
const REPERTORY_PATHS = [
  './data/repertory_master.json',
  'data/repertory_master.json',
  'repertory_master.json'
];

// DOM elements
const statusText = document.getElementById('status-text');
const resultContainer = document.getElementById('result-container');
const resultHeader = document.getElementById('result-header');
const resultOutput = document.getElementById('result-output');
const resultContext = document.getElementById('result-context');

const mainInput = document.getElementById('main-input');
const findMatchBtn = document.getElementById('find-match-btn');
const askAiBtn = document.getElementById('ask-ai-btn');
const directSearchBtn = document.getElementById('direct-search-btn');
const analyzeTotalityBtn = document.getElementById('analyze-totality-btn');
const clearSymptomsBtn = document.getElementById('clear-symptoms-btn');

const singleMode = document.getElementById('single-mode');
const totalityMode = document.getElementById('totality-mode');
const remedyMode = document.getElementById('remedy-mode');

// Remedy search DOM elements
const remedyInput = document.getElementById('remedy-input');
const remedySuggestions = document.getElementById('remedy-suggestions');
const searchRemedyBtn = document.getElementById('search-remedy-btn');
const popularRemediesBtn = document.getElementById('popular-remedies-btn');

let repertoryDB = [];
let allRemedies = [];
let remedyIndex = {}; // Inverted index for fast remedy lookup

// Load repertory data
async function loadRepertory() {
  statusText.textContent = 'Loading repertory data...';

  for (let path of REPERTORY_PATHS) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      repertoryDB = await res.json();
      
      buildRemedyIndex();

      let count = repertoryDB.length;
      let rounded = Math.round(count / 1000) * 1000; 
      statusText.textContent = `Ready! Searching ${rounded.toLocaleString()}+ rubrics.`;

      console.log(`Loaded repertory from ${path} (${count} actual rubrics)`);
      return;
    } catch (err) {
      console.warn(`Failed to load from ${path}:`, err);
    }
  }

  statusText.textContent = 'Failed to load repertory data. Make sure repertory_master.json is available.';
}

function buildRemedyIndex() {
    console.log("Building remedy index...");
    const tempIndex = {};
    const remedySet = new Set();

    repertoryDB.forEach((rubric, index) => {
        if (rubric.m && rubric.m.length) {
            rubric.m.forEach(remedy => {
                const cleanRemedy = remedy.trim();
                remedySet.add(cleanRemedy);
                const key = cleanRemedy.toLowerCase();
                if (!tempIndex[key]) {
                    tempIndex[key] = [];
                }
                tempIndex[key].push(index);
            });
        }
    });

    remedyIndex = tempIndex;
    allRemedies = Array.from(remedySet).sort();
    console.log(`Remedy index built. Found ${allRemedies.length} unique remedies.`);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Mode switching
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  modeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      singleMode.classList.add('hidden');
      totalityMode.classList.add('hidden');
      remedyMode.classList.add('hidden');
      
      if (this.value === 'single') {
        singleMode.classList.remove('hidden');
      } else if (this.value === 'totality') {
        totalityMode.classList.remove('hidden');
      } else if (this.value === 'remedy') {
        remedyMode.classList.remove('hidden');
      }
      resultContainer.style.display = 'none';
    });
  });
  
  loadRepertory();
});

// Totality Management Functions
function addSymptom() {
  const symptomsList = document.getElementById('symptoms-list');
  const newEntry = document.createElement('div');
  newEntry.className = 'symptom-entry';
  newEntry.innerHTML = `
    <input type="text" placeholder="Enter symptom or rubric..." class="symptom-input-field">
    <button class="remove-symptom" onclick="removeSymptom(this)">Remove</button>
  `;
  symptomsList.appendChild(newEntry);
}

function removeSymptom(button) {
  const symptomsList = document.getElementById('symptoms-list');
  if (symptomsList.children.length > 1) {
    button.parentElement.remove();
  }
}

function clearAllSymptoms() {
  const symptomsList = document.getElementById('symptoms-list');
  symptomsList.innerHTML = `
    <div class="symptom-entry">
      <input type="text" placeholder="Enter symptom or rubric..." class="symptom-input-field">
      <button class="remove-symptom" onclick="removeSymptom(this)">Remove</button>
    </div>
  `;
}

function getSymptomsList() {
  const inputs = document.querySelectorAll('.symptom-input-field');
  const symptoms = [];
  inputs.forEach(input => {
    const value = input.value.trim();
    if (value) {
      symptoms.push(value);
    }
  });
  return symptoms;
}

// Add rubric to totality analysis
function addRubricToTotality(rubric) {
  const totalityRadio = document.querySelector('input[name="mode"][value="totality"]');
  if (!totalityRadio.checked) {
    totalityRadio.checked = true;
    singleMode.classList.add('hidden');
    remedyMode.classList.add('hidden');
    totalityMode.classList.remove('hidden');
  }

  const inputs = document.querySelectorAll('.symptom-input-field');
  let addedToExisting = false;
  
  for (let input of inputs) {
    if (!input.value.trim()) {
      input.value = rubric;
      addedToExisting = true;
      break;
    }
  }
  
  if (!addedToExisting) {
    addSymptom();
    const newInputs = document.querySelectorAll('.symptom-input-field');
    newInputs[newInputs.length - 1].value = rubric;
  }

  showNotification(`Added "${rubric}" to totality analysis`, 'success');
}

// Clipboard Functions
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification(`Copied to clipboard`, 'success');
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showNotification(`Copied to clipboard`, 'success');
    } catch (fallbackErr) {
      showNotification('Failed to copy to clipboard', 'error');
    }
    document.body.removeChild(textArea);
  }
}

// Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => notification.classList.add('show'), 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Totality Analysis Functions
async function analyzeTotality() {
  const symptoms = getSymptomsList();
  
  if (symptoms.length < 2) {
    showNotification('Please enter at least 2 symptoms for totality analysis.', 'error');
    return;
  }

  analyzeTotalityBtn.disabled = true;
  analyzeTotalityBtn.textContent = 'Analyzing...';
  
  try {
    const symptomMatches = [];
    for (const symptom of symptoms) {
      const matches = findClosestRubrics(symptom);
      symptomMatches.push({
        symptom: symptom,
        matches: matches
      });
    }

    const remedyTotality = calculateRemedyTotality(symptomMatches);
    
    displayTotalityResults(symptoms, symptomMatches, remedyTotality);
    
  } catch (error) {
    console.error('Totality analysis error:', error);
    showNotification('Error during totality analysis. Please try again.', 'error');
  } finally {
    analyzeTotalityBtn.disabled = false;
    analyzeTotalityBtn.textContent = 'Analyze Totality';
  }
}

function calculateRemedyTotality(symptomMatches) {
  const remedyScores = {};
  const remedyCoverage = {};

  symptomMatches.forEach((symptomData, symptomIndex) => {
    const { symptom, matches } = symptomData;
    
    matches.forEach(match => {
      if (match.m && match.m.length) {
        match.m.forEach(remedy => {
          if (!remedyScores[remedy]) {
            remedyScores[remedy] = 0;
            remedyCoverage[remedy] = [];
          }
          remedyScores[remedy] += 1;
          remedyCoverage[remedy].push({
            symptom: symptom,
            rubric: match.r,
            source: match.src
          });
        });
      }
    });
  });

  const sortedRemedies = Object.keys(remedyScores)
    .map(remedy => ({
      remedy: remedy,
      score: remedyScores[remedy],
      coverage: remedyCoverage[remedy],
      percentage: Math.round((remedyScores[remedy] / symptomMatches.length) * 100)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Top 20 remedies

  return sortedRemedies;
}

function displayTotalityResults(symptoms, symptomMatches, remedyTotality) {
  resultContainer.style.display = 'block';
  resultHeader.textContent = `Totality Analysis Results (${symptoms.length} symptoms)`;

  let html = '<div class="totality-result">';
  
  html += `<h3>Top Remedies by Coverage</h3>`;
  
  if (remedyTotality.length === 0) {
    html += '<p><em>No remedies found that match the given symptoms. Try different symptom descriptions.</em></p>';
  } else {
    remedyTotality.slice(0, 10).forEach((remedy, index) => {
      html += `<div class="remedy-analysis">
        <h4>${index + 1}. ${remedy.remedy} 
          <span class="remedy-score">${remedy.score}/${symptoms.length} symptoms (${remedy.percentage}%)</span>
        </h4>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${remedy.percentage}%">
            ${remedy.percentage}%
          </div>
        </div>
        <details>
          <summary>View covered symptoms (${remedy.score})</summary>
          <ul>`;
      
      remedy.coverage.forEach(cov => {
        html += `<li><strong>${cov.symptom}</strong> → ${cov.rubric} <em>(${cov.source})</em></li>`;
      });
      
      html += `</ul></details></div>`;
    });
  }

  html += '</div>';

  // Individual symptom analysis
  html += '<div style="margin-top: 30px;"><h3>Individual Symptom Analysis</h3>';
  
  symptomMatches.forEach((symptomData, index) => {
    const { symptom, matches } = symptomData;
    html += `<div class="rubric-block">
      <h4>Symptom ${index + 1}: "${symptom}"</h4>`;
    
    if (matches.length === 0) {
      html += '<p><em>No matches found for this symptom.</em></p>';
    } else {
      const topMatch = matches[0];
      html += `<p><strong>Best Match:</strong> ${topMatch.r}</p>`;
      
      if (topMatch.m && topMatch.m.length) {
        html += `<div><strong>Remedies (${topMatch.m.length}):</strong><br>` +
                topMatch.m.slice(0, 20).map(rem => `<span class="remedy-tag">${rem}</span>`).join(" ");
        if (topMatch.m.length > 20) {
          html += ` <em>... and ${topMatch.m.length - 20} more</em>`;
        }
        html += `</div>`;
      }
      
      html += `<p class="src">Source: ${topMatch.src}</p>`;
      
      if (matches.length > 1) {
        html += `<p><em>${matches.length - 1} other similar rubrics found</em></p>`;
      }
    }
    
    html += '</div>';
  });

  html += '</div>';
  
  resultOutput.innerHTML = html;
  resultContext.textContent = `Analysis completed for ${symptoms.length} symptoms. Showing top remedies by symptom coverage.`;
}

// Search Functions
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function findClosestRubrics(query) {
  const normalizedQuery = normalize(query);
  const queryWords = normalizedQuery.split(/\s+/);

  // 1. Exact match
  let exact = repertoryDB.filter(r => normalize(r.r) === normalizedQuery && r.m);
  if (exact.length) return exact;

  // 2. Keyword match (all query words appear)
  let keywordMatches = repertoryDB.filter(r => {
    const normRubric = normalize(r.r);
    return queryWords.every(w => normRubric.includes(w)) && r.m;
  });
  if (keywordMatches.length) return keywordMatches;

  // 3. Partial inclusion
  let partialMatches = repertoryDB.filter(r => normalize(r.r).includes(normalizedQuery) && r.m);
  if (partialMatches.length) return partialMatches;

  // 4. Fall back: rubric-only examples (no remedies)
  let examples = repertoryDB.filter(r => normalize(r.r).includes(normalizedQuery));
  return examples;
}

// Remedy Search Functions
function handleRemedySearch(remedyName) {
  if (!remedyName) {
    showNotification('Please enter a remedy name.', 'error');
    return;
  }
  
  const lowerRemedy = remedyName.toLowerCase().trim();
  const rubricIndices = remedyIndex[lowerRemedy];
  
  if (rubricIndices && rubricIndices.length) {
    const matches = rubricIndices.map(index => repertoryDB[index]);
    displayRemedyResults(remedyName, matches);
  } else {
    displayRemedyResults(remedyName, []);
  }
}

function displayRemedyResults(remedyName, matches) {
  resultContainer.style.display = 'block';
  const capitalizedRemedy = remedyName.charAt(0).toUpperCase() + remedyName.slice(1);

  if (!matches.length) {
    resultHeader.textContent = `No rubrics found for "${capitalizedRemedy}"`;
    resultOutput.innerHTML = '<p><em>This remedy was not found in any rubrics. Please check the spelling or try another remedy.</em></p>';
    resultContext.textContent = '';
    return;
  }

  resultHeader.textContent = `Found ${matches.length} rubrics for "${capitalizedRemedy}"`;
  
  let html = '';
  matches.forEach(m => {
    const rubricForJs = m.r.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    html += `<div class="rubric-block">
      <div class="rubric-actions">
        <button class="action-btn add-totality-btn" onclick="addRubricToTotality('${rubricForJs}')">
          Add to Totality
        </button>
        <button class="action-btn copy-btn" onclick="copyToClipboard('${rubricForJs}')">
          Copy
        </button>
      </div>
      <p><strong>Rubric:</strong> ${m.r}</p>`;

    if (m.m && m.m.length) {
      const remedyTags = m.m.map(rem => {
        const isMatch = rem.toLowerCase() === remedyName.toLowerCase();
        return `<span class="remedy-tag ${isMatch ? 'highlighted-remedy' : ''}">${rem}</span>`;
      }).join(" ");
      html += `<div><strong>Remedies (${m.m.length}):</strong><br>${remedyTags}</div>`;
    }

    html += `<p class="src">Source: ${m.src}</p></div>`;
  });

  resultOutput.innerHTML = html;
  resultContext.textContent = `Showing all rubrics containing ${capitalizedRemedy}. The highlighted remedy is your search target.`;
}

function handleShowPopularRemedies() {
  const popularRemedies = [
    'Acon', 'Ars', 'Bell', 'Bry', 'Calc', 'Cham', 
    'Hep', 'Ign', 'Lyc', 'Merc', 'Nux-v', 'Phos', 
    'Puls', 'Rhus-t', 'Sep', 'Sil', 'Sulph'
  ];

  resultContainer.style.display = 'block';
  resultHeader.textContent = 'Popular Remedies';
  
  let html = `<p>Click a remedy to see all its associated rubrics.</p>
              <div class="popular-remedies-grid">`;
  
  popularRemedies.forEach(remedy => {
    const remedyJs = remedy.replace(/'/g, "\\'");
    html += `<div class="popular-remedy-item" onclick="selectAndSearchRemedy('${remedyJs}')">${remedy}</div>`;
  });
  
  html += '</div>';

  resultOutput.innerHTML = html;
  resultContext.textContent = '';
}

function selectAndSearchRemedy(remedy) {
  remedyInput.value = remedy;
  handleRemedySearch(remedy);
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Display Functions with Working Buttons
function displayMatches(query, matches) {
  resultContainer.style.display = 'block';

  if (!matches.length) {
    resultHeader.textContent = `No match found for "${query}"`;
    resultOutput.innerHTML = '<p><em>No matching rubrics found. Please try different keywords or check spelling.</em></p>';
    resultContext.textContent = '';
    return;
  }

  resultHeader.textContent = `Results for "${query}"`;

  let html = '';
  matches.forEach((m, index) => {
    const rubricForJs = m.r.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    html += `<div class="rubric-block">
      <div class="rubric-actions">
        <button class="action-btn add-totality-btn" onclick="addRubricToTotality('${rubricForJs}')">
          Add to Totality
        </button>
        <button class="action-btn copy-btn" onclick="copyToClipboard('${rubricForJs}')">
          Copy
        </button>
      </div>
      <p><strong>Rubric:</strong> ${m.r}</p>`;

    if (m.m && m.m.length) {
      html += `<div><strong>Remedies (${m.m.length}):</strong><br>` +
              m.m.map(rem => `<span class="remedy-tag">${rem}</span>`).join(" ") +
              `</div>`;
    } else if (m.t) {
      html += `<p><em>Example:</em> ${m.t}</p>`;
    }

    html += `<p class="src">Source: ${m.src}</p></div>`;
  });

  resultOutput.innerHTML = html;
  resultContext.textContent = `Found ${matches.length} matching rubric${matches.length > 1 ? 's' : ''}. Click "Add to Totality" to build comprehensive analysis, or "Copy" to copy to clipboard.`;
}

// AI and Search Handlers
async function handleAskAI(query) {
  if (!query) {
    showNotification('Please enter a symptom description.', 'error');
    return;
  }

  askAiBtn.disabled = true;
  askAiBtn.textContent = 'Generating...';

  try {
    const selectedRepertory = document.querySelector('input[name="repertory"]:checked').value;
    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptom: query, repertory: selectedRepertory })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const generatedRubric = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (generatedRubric) {
      const matches = findClosestRubrics(generatedRubric);
      displayMatches(generatedRubric, matches);
      showNotification('AI rubric generated successfully!', 'success');
    } else {
      console.error("Could not find 'generatedRubric' in the AI response.", result);
      displayMatches(query, []); // Show "No results found" for this case
    }

  } catch (err) {
    console.error("AI error:", err);
    showNotification('AI generation failed. Please try again.', 'error');
    handleDirectSearch(query);
  } finally {
    askAiBtn.disabled = false;
    askAiBtn.textContent = 'Ask AI to Generate';
  }
}

function handleDirectSearch(query) {
  if (!query) {
    showNotification('Please enter a rubric or symptom.', 'error');
    return;
  }
  const matches = findClosestRubrics(query);
  displayMatches(query, matches);
}

// Event Listeners
if (findMatchBtn) {
  findMatchBtn.addEventListener("click", () => {
    handleDirectSearch(mainInput.value.trim());
  });
}

if (askAiBtn) {
  askAiBtn.addEventListener("click", () => {
    handleAskAI(mainInput.value.trim());
  });
}

if (directSearchBtn) {
  directSearchBtn.addEventListener("click", () => {
    handleDirectSearch(mainInput.value.trim());
  });
}

if (analyzeTotalityBtn) {
  analyzeTotalityBtn.addEventListener("click", analyzeTotality);
}

if (clearSymptomsBtn) {
  clearSymptomsBtn.addEventListener("click", () => {
    clearAllSymptoms();
    resultContainer.style.display = 'none';
    showNotification('All symptoms cleared', 'info');
  });
}

// Remedy Search Listeners
if (searchRemedyBtn) {
  searchRemedyBtn.addEventListener('click', () => {
      handleRemedySearch(remedyInput.value.trim());
  });
}

if (popularRemediesBtn) {
  popularRemediesBtn.addEventListener('click', handleShowPopularRemedies);
}

if (remedyInput) {
  remedyInput.addEventListener('input', () => {
    const query = remedyInput.value.toLowerCase();
    if (query.length < 2) {
      remedySuggestions.style.display = 'none';
      return;
    }
    
    const filtered = allRemedies.filter(r => r.toLowerCase().startsWith(query)).slice(0, 10);
    
    if (filtered.length) {
      remedySuggestions.innerHTML = filtered.map(r => 
        `<div class="remedy-suggestion-item">${r}</div>`
      ).join('');
      remedySuggestions.style.display = 'block';
    } else {
      remedySuggestions.style.display = 'none';
    }
  });

  remedySuggestions.addEventListener('click', (e) => {
    if (e.target.classList.contains('remedy-suggestion-item')) {
      remedyInput.value = e.target.textContent;
      remedySuggestions.style.display = 'none';
      handleRemedySearch(remedyInput.value.trim());
    }
  });
}

document.addEventListener('click', (e) => {
    if (remedyMode && !remedyMode.contains(e.target)) {
        if (remedySuggestions) remedySuggestions.style.display = 'none';
    }
});

// Keyboard Support
document.addEventListener('keypress', function(e) {
  if (e.target.classList.contains('symptom-input-field') && e.key === 'Enter') {
    e.preventDefault();
    addSymptom();
    const inputs = document.querySelectorAll('.symptom-input-field');
    inputs[inputs.length - 1].focus();
  }

  if (e.target.id === 'main-input' && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleDirectSearch(e.target.value.trim());
  }
  
  if (e.target.id === 'remedy-input' && e.key === 'Enter') {
    e.preventDefault();
    if (remedySuggestions) remedySuggestions.style.display = 'none';
    handleRemedySearch(e.target.value.trim());
  }
});

// Error Handling
window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
  showNotification('An unexpected error occurred', 'error');
});