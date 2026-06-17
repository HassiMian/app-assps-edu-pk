// src/services/ai/questionClassifier.js
// Heuristic-based rule classifier for bulk text parsing

function detectQuestionType(text) {
  const lower = text.toLowerCase()
  
  // MCQ patterns
  if (/\b[a-d]\)\s/i.test(text) || /\b(a|b|c|d)\./i.test(text) || /options?:/i.test(text)) {
    return 'mcq'
  }
  
  // Short questions
  if (/^(what|why|how|define|list|state|briefly|who|when)\b/i.test(lower) || lower.length < 150) {
    if (!/explain in detail|describe in detail/i.test(lower)) {
      return 'short'
    }
  }
  
  // Long questions
  if (/^(explain|describe|discuss|elaborate|compare|differentiate|prove)\b/i.test(lower) || lower.length >= 150) {
    return 'long'
  }
  
  // Default fallback
  return 'short'
}

function extractOptions(text) {
  const options = []
  
  // Try to find options like a) b) c) d) or A. B. C. D.
  const regex = /(?:^|\s)([a-d]|[iv]+)[\)\.]\s+([^\n]+?)(?=(?:\s+[a-d]|[iv]+)[\)\.]|$)/gi
  let match
  
  while ((match = regex.exec(text)) !== null) {
    options.push({
      label: match[1].toUpperCase(),
      text: match[2].trim(),
      textUrdu: ''
    })
  }
  
  return options.length >= 2 ? options : []
}

function parseBulkText(rawText) {
  if (!rawText) return []
  
  // Split by common question delimiters: "Q1.", "Question 1:", "1.", etc.
  // Note: this is a basic heuristic. A more robust NLP parser would be better.
  const rawQuestions = rawText.split(/(?:\n|^)(?:Q\d+|Question\s*\d+|\d+)[\.\:\)]/i)
                              .map(q => q.trim())
                              .filter(q => q.length > 5)
                              
  const parsedQuestions = rawQuestions.map((qText, index) => {
    // Attempt to separate question text from options
    let cleanText = qText
    let options = []
    
    // Check if it's likely an MCQ
    const optMatch = qText.match(/(?:[a-d]|[iv]+)[\)\.]\s/i)
    if (optMatch) {
      const optIndex = qText.indexOf(optMatch[0])
      cleanText = qText.substring(0, optIndex).trim()
      options = extractOptions(qText.substring(optIndex))
    }
    
    const type = options.length > 0 ? 'mcq' : detectQuestionType(cleanText)
    const marks = type === 'mcq' ? 1 : type === 'short' ? 2 : 5
    
    return {
      type,
      text: cleanText,
      options,
      marks,
      confidence: 85 // Rule-based confidence
    }
  })
  
  return parsedQuestions
}

module.exports = {
  detectQuestionType,
  extractOptions,
  parseBulkText
}
