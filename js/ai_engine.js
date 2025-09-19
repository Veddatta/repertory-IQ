/**
 * Homeopathic AI Engine
 * Local AI processing for symptom analysis
 * This works alongside the Netlify function for enhanced functionality
 */

class HomeopathicAI {
    constructor() {
        // Common body parts for symptom recognition
        this.bodyParts = [
            'head', 'eye', 'ear', 'nose', 'throat', 'neck', 'chest', 'heart', 
            'lungs', 'abdomen', 'stomach', 'liver', 'kidney', 'back', 'spine',
            'arm', 'hand', 'finger', 'leg', 'foot', 'knee', 'ankle', 'skin',
            'face', 'mouth', 'tongue', 'teeth', 'gums', 'bladder', 'urethra',
            'breast', 'shoulder', 'elbow', 'wrist', 'hip', 'thigh', 'calf'
        ];
        
        // Common symptoms and sensations
        this.symptoms = [
            'pain', 'ache', 'burning', 'stinging', 'throbbing', 'sharp', 'dull',
            'cramping', 'shooting', 'pressing', 'bursting', 'cutting', 'drawing',
            'inflammation', 'swelling', 'redness', 'itching', 'numbness', 'tingling',
            'weakness', 'stiffness', 'tension', 'spasm', 'trembling', 'twitching',
            'headache', 'migraine', 'dizziness', 'anxiety', 'depression', 'irritability',
            'nausea', 'cough', 'fever', 'chills', 'sweating', 'fatigue', 'insomnia',
            'restlessness', 'fear', 'anger', 'sadness', 'confusion', 'forgetfulness'
        ];
        
        // Modalities (what makes symptoms better or worse)
        this.modalities = {
            worse: [
                'morning', 'evening', 'night', 'cold', 'heat', 'motion', 'rest', 
                'pressure', 'touch', 'lying', 'sitting', 'standing', 'walking',
                'eating', 'drinking', 'weather changes', 'damp', 'wind', 'noise',
                'light', 'stress', 'emotions', 'menstruation', 'pregnancy'
            ],
            better: [
                'warmth', 'cold', 'motion', 'rest', 'pressure', 'open air',
                'lying down', 'sitting up', 'massage', 'eating', 'drinking',
                'sleep', 'company', 'consolation', 'distraction', 'music'
            ]
        };

        // Enhanced symptom to rubric mapping
        this.symptomRubricMap = {
            // Mental symptoms
            'anxiety': [
                'MIND - ANXIETY - general',
                'MIND - ANXIETY - evening',
                'MIND - ANXIETY - night',
                'MIND - FEAR - general'
            ],
            'depression': [
                'MIND - SADNESS',
                'MIND - DESPAIR',
                'MIND - WEEPING',
                'MIND - DISCOURAGED'
            ],
            'irritability': [
                'MIND - IRRITABILITY',
                'MIND - ANGER',
                'MIND - IMPATIENCE',
                'MIND - QUARRELSOME'
            ],
            'fear': [
                'MIND - FEAR - general',
                'MIND - FEAR - death',
                'MIND - FEAR - dark',
                'MIND - ANXIETY - fear, with'
            ],
            'restlessness': [
                'MIND - RESTLESSNESS',
                'MIND - RESTLESSNESS - night',
                'GENERALITIES - RESTLESSNESS'
            ],

            // Head symptoms
            'headache': [
                'HEAD - PAIN - general',
                'HEAD - PAIN - pulsating',
                'HEAD - PAIN - pressing',
                'HEAD - PAIN - bursting'
            ],
            'migraine': [
                'HEAD - PAIN - sides',
                'HEAD - PAIN - temples',
                'HEAD - PAIN - nausea, with',
                'HEAD - PAIN - periodic'
            ],
            'dizziness': [
                'VERTIGO - GENERAL',
                'VERTIGO - morning',
                'VERTIGO - rising from bed, on',
                'VERTIGO - nausea, with'
            ],

            // Digestive symptoms
            'nausea': [
                'STOMACH - NAUSEA',
                'STOMACH - VOMITING',
                'STOMACH - NAUSEA - morning',
                'STOMACH - NAUSEA - pregnancy, during'
            ],
            'stomach pain': [
                'STOMACH - PAIN - general',
                'STOMACH - PAIN - cramping',
                'STOMACH - PAIN - burning',
                'ABDOMEN - PAIN - stomach'
            ],
            'heartburn': [
                'STOMACH - HEARTBURN',
                'STOMACH - PAIN - burning',
                'CHEST - PAIN - burning'
            ],

            // Respiratory symptoms
            'cough': [
                'COUGH - GENERAL',
                'COUGH - DRY',
                'COUGH - NIGHT',
                'COUGH - IRRITATING'
            ],
            'asthma': [
                'RESPIRATION - ASTHMATIC',
                'RESPIRATION - DIFFICULT',
                'CHEST - CONSTRICTION'
            ],

            // General symptoms
            'fever': [
                'GENERALITIES - HEAT - fever',
                'GENERALITIES - HEAT',
                'CHILL - FEVER, with',
                'FEVER - GENERAL'
            ],
            'fatigue': [
                'GENERALITIES - WEAKNESS',
                'GENERALITIES - LASSITUDE',
                'MIND - DULLNESS'
            ],
            'insomnia': [
                'SLEEP - SLEEPLESSNESS',
                'SLEEP - WAKING - frequent',
                'MIND - RESTLESSNESS - night'
            ]
        };

        // Remedy characteristics for basic matching
        this.remedyCharacteristics = {
            'Aconitum': ['sudden', 'violent', 'fear', 'anxiety', 'restlessness', 'shock'],
            'Arsenicum': ['anxiety', 'restlessness', 'burning', 'weakness', 'fastidious'],
            'Belladonna': ['sudden', 'violent', 'hot', 'red', 'throbbing', 'fever'],
            'Bryonia': ['irritable', 'worse motion', 'better rest', 'dry', 'thirsty'],
            'Chamomilla': ['irritable', 'angry', 'restless', 'teething', 'colic'],
            'Nux vomica': ['irritable', 'chilly', 'digestive', 'overwork', 'stimulants'],
            'Pulsatilla': ['mild', 'weeping', 'changeable', 'better open air', 'clingy'],
            'Sulphur': ['burning', 'itching', 'worse heat', 'philosophical', 'untidy']
        };
    }

    /**
     * Parse natural language symptom description
     * @param {string} text - User's symptom description
     * @returns {Object} Parsed symptom data
     */
    parseNaturalLanguage(text) {
        const lowerText = text.toLowerCase();
        
        // Extract body parts
        const extractedBodyParts = this.bodyParts.filter(part => 
            lowerText.includes(part)
        );

        // Extract symptoms
        const extractedSymptoms = this.symptoms.filter(symptom => 
            lowerText.includes(symptom)
        );

        // Extract modalities
        const extractedModalities = {
            worse: this.modalities.worse.filter(mod => 
                lowerText.includes(`worse ${mod}`) || 
                lowerText.includes(`aggravated by ${mod}`) ||
                lowerText.includes(`< ${mod}`)
            ),
            better: this.modalities.better.filter(mod => 
                lowerText.includes(`better ${mod}`) || 
                lowerText.includes(`improved by ${mod}`) ||
                lowerText.includes(`> ${mod}`)
            )
        };

        // Extract intensity
        const intensity = this.extractIntensity(lowerText);

        // Extract timing
        const timing = this.extractTiming(lowerText);

        return {
            bodyParts: extractedBodyParts,
            symptoms: extractedSymptoms,
            modalities: extractedModalities,
            intensity: intensity,
            timing: timing,
            originalText: text
        };
    }

    /**
     * Extract intensity from symptom description
     * @param {string} text - Lower case symptom text
     * @returns {string} Intensity level
     */
    extractIntensity(text) {
        const intensityWords = {
            mild: ['mild', 'slight', 'little', 'minor', 'weak'],
            moderate: ['moderate', 'medium', 'average'],
            severe: ['severe', 'intense', 'extreme', 'unbearable', 'terrible', 'awful', 'violent']
        };

        for (const [level, words] of Object.entries(intensityWords)) {
            if (words.some(word => text.includes(word))) {
                return level;
            }
        }
        return 'moderate'; // default
    }

    /**
     * Extract timing information
     * @param {string} text - Lower case symptom text
     * @returns {Array} Timing modifiers
     */
    extractTiming(text) {
        const timingWords = ['morning', 'afternoon', 'evening', 'night', 'midnight', 'dawn'];
        return timingWords.filter(time => text.includes(time));
    }

    /**
     * Map parsed symptoms to potential rubrics
     * @param {Object} parsedData - Result from parseNaturalLanguage
     * @returns {Array} Array of potential rubrics with confidence scores
     */
    mapToRubrics(parsedData) {
        const matchedRubrics = new Map(); // Use map to avoid duplicates
        
        // Map symptoms to rubrics
        for (const symptom of parsedData.symptoms) {
            if (this.symptomRubricMap[symptom]) {
                for (const rubric of this.symptomRubricMap[symptom]) {
                    if (!matchedRubrics.has(rubric)) {
                        matchedRubrics.set(rubric, {
                            rubric: rubric,
                            confidence: this.calculateConfidence(symptom, parsedData),
                            matchedSymptom: symptom,
                            source: 'AI Engine'
                        });
                    }
                }
            }
        }

        // Add body part specific rubrics
        for (const bodyPart of parsedData.bodyParts) {
            const bodyPartRubrics = this.getBodyPartRubrics(bodyPart, parsedData.symptoms);
            for (const item of bodyPartRubrics) {
                if (!matchedRubrics.has(item.rubric)) {
                     matchedRubrics.set(item.rubric, item);
                }
            }
        }

        // Convert map values to array and sort by confidence
        return Array.from(matchedRubrics.values()).sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Calculate confidence score for a rubric match
     * @param {string} symptom - Matched symptom
     * @param {Object} parsedData - Parsed symptom data
     * @returns {number} Confidence score (0-100)
     */
    calculateConfidence(symptom, parsedData) {
        let confidence = 70; // base confidence
        
        // Boost if multiple related symptoms
        if (parsedData.symptoms.length > 1) confidence += 5;
        
        // Boost if specific body part mentioned
        if (parsedData.bodyParts.length > 0) confidence += 10;
        
        // Boost if modalities mentioned
        if (parsedData.modalities.worse.length > 0 || parsedData.modalities.better.length > 0) {
            confidence += 10;
        }

        // Boost for timing information
        if (parsedData.timing.length > 0) confidence += 5;

        // Boost for intensity information
        if (parsedData.intensity !== 'moderate') confidence += 5;
        
        return Math.min(confidence, 95); // cap at 95%
    }

    /**
     * Get rubrics specific to body parts
     * @param {string} bodyPart - Body part name
     * @param {Array} symptoms - Array of symptoms
     * @returns {Array} Array of body part specific rubrics
     */
    getBodyPartRubrics(bodyPart, symptoms) {
        const rubrics = [];
        const mainSymptom = symptoms.find(s => s !== 'pain' && s !== 'ache') || 'pain';

        // Generate rubrics based on body part and symptoms
        if (symptoms.includes('pain') || symptoms.includes('ache')) {
            rubrics.push({
                rubric: `${bodyPart.toUpperCase()} - PAIN - ${mainSymptom}`,
                confidence: 85,
                matchedSymptom: `${bodyPart} ${mainSymptom}`,
                source: 'AI Engine'
            });
        }

        // Add more specific rubrics based on body part
        switch(bodyPart.toLowerCase()) {
            case 'head':
                if (symptoms.includes('headache')) {
                    rubrics.push({
                        rubric: 'HEAD - PAIN - general',
                        confidence: 90,
                        matchedSymptom: 'headache',
                        source: 'AI Engine'
                    });
                }
                break;
            case 'stomach':
                if (symptoms.includes('nausea')) {
                    rubrics.push({
                        rubric: 'STOMACH - NAUSEA',
                        confidence: 90,
                        matchedSymptom: 'stomach nausea',
                        source: 'AI Engine'
                    });
                }
                break;
        }
        
        return rubrics;
    }

    /**
     * Get basic remedy suggestions based on symptoms
     * @param {Object} parsedData - Parsed symptom data
     * @returns {Array} Array of potential remedies with reasons
     */
    suggestRemedies(parsedData) {
        const remedySuggestions = [];

        for (const [remedy, characteristics] of Object.entries(this.remedyCharacteristics)) {
            let score = 0;
            const matchedCharacteristics = [];

            // Check for matching characteristics
            for (const char of characteristics) {
                if (parsedData.originalText.toLowerCase().includes(char)) {
                    score += 10;
                    matchedCharacteristics.push(char);
                }
            }

            // Boost score for symptom matches
            for (const symptom of parsedData.symptoms) {
                if (characteristics.includes(symptom)) {
                    score += 15;
                    matchedCharacteristics.push(symptom);
                }
            }

            if (score > 0) {
                remedySuggestions.push({
                    remedy: remedy,
                    score: score,
                    matchedCharacteristics: matchedCharacteristics,
                    confidence: Math.min(score * 2, 90)
                });
            }
        }

        return remedySuggestions.sort((a, b) => b.score - a.score);
    }

    /**
     * Generate a comprehensive analysis of the symptom
     * @param {string} symptomText - User's symptom description
     * @returns {Object} Complete analysis
     */
    analyzeSymptom(symptomText) {
        const parsed = this.parseNaturalLanguage(symptomText);
        const rubrics = this.mapToRubrics(parsed);
        const remedies = this.suggestRemedies(parsed);

        return {
            parsedSymptoms: parsed,
            suggestedRubrics: rubrics,
            remedySuggestions: remedies,
            analysis: {
                confidence: rubrics.length > 0 ? Math.max(...rubrics.map(r => r.confidence)) : 0,
                complexity: parsed.symptoms.length + parsed.bodyParts.length + parsed.modalities.worse.length + parsed.modalities.better.length,
                completeness: this.calculateCompleteness(parsed)
            }
        };
    }

    /**
     * Calculate how complete the symptom description is
     * @param {Object} parsedData - Parsed symptom data
     * @returns {number} Completeness score (0-100)
     */
    calculateCompleteness(parsedData) {
        let score = 0;
        
        if (parsedData.symptoms.length > 0) score += 30;
        if (parsedData.bodyParts.length > 0) score += 25;
        if (parsedData.modalities.worse.length > 0) score += 20;
        if (parsedData.modalities.better.length > 0) score += 15;
        if (parsedData.timing.length > 0) score += 10;
        
        return Math.min(score, 100);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomeopathicAI;
}

// Global availability for browser use
if (typeof window !== 'undefined') {
    window.HomeopathicAI = HomeopathicAI;
}