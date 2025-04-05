import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

// JargonTranslator Component 
const JargonTranslator = ({ transcriptEntries, currentUser, detectedJargon }) => {
  const [jargonGlossary, setJargonGlossary] = useState({});
  const [customJargon, setCustomJargon] = useState({});
  const [translatedTranscript, setTranslatedTranscript] = useState([]);
  const [isAddingTerm, setIsAddingTerm] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightJargon, setHighlightJargon] = useState(true);
  const [suggestedTerm, setSuggestedTerm] = useState(null);
  const [isExporting, setIsExporting] = useState(false); // Add missing state
  const glossaryRef = useRef(null);

  // Default jargon dictionary
  const defaultJargon = {
    "ROI": "Return on Investment - how much money we'll get back compared to what we spent",
    "SLA": "Service Level Agreement - our promised service speed/quality to customers",
    "KPI": "Key Performance Indicator - metrics used to evaluate success",
    "EOD": "End of Day - by the end of the working day",
    "ASAP": "As Soon As Possible - urgently, at the earliest opportunity",
    "OKR": "Objectives and Key Results - goal-setting framework for defining measurable goals",
    "MVP": "Minimum Viable Product - version with just enough features to be usable",
    "AI": "Artificial Intelligence - computer systems able to perform tasks that normally require human intelligence",
    "ML": "Machine Learning - AI approach that enables systems to learn from data",
    "API": "Application Programming Interface - connection that allows software to communicate with other software",
    "UI": "User Interface - what users see and interact with in software",
    "UX": "User Experience - overall experience a user has with a product",
    "B2B": "Business to Business - companies that sell to other businesses",
    "B2C": "Business to Consumer - companies that sell directly to consumers",
    "CRM": "Customer Relationship Management - system for managing customer interactions",
    "CTA": "Call to Action - prompt encouraging users to take a specific action",
    "SEO": "Search Engine Optimization - process of improving site visibility in search results"
  };

  // Add the missing exportGlossary function
  const exportGlossary = async () => {
    try {
      setIsExporting(true);
      
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const margin = 50;
      const contentWidth = width - 2 * margin;
      let y = height - margin;
      
      // Add title
      page.drawText('Jargon Glossary', {
        x: margin,
        y: y,
        size: 24,
        font: boldFont,
        color: { r: 0, g: 0, b: 0 }
      });
      y -= 40;
      
      // Add date
      const date = new Date().toLocaleDateString();
      page.drawText(`Generated on: ${date}`, {
        x: margin,
        y: y,
        size: 12,
        font: font,
        color: { r: 0.4, g: 0.4, b: 0.4 }
      });
      y -= 30;
      
      // Combine glossaries
      const combined = { ...jargonGlossary, ...customJargon };
      const sortedTerms = Object.keys(combined).sort();
      
      // Add terms
      for (const term of sortedTerms) {
        const definition = combined[term];
        
        // Check if we need a new page
        if (y < 100) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
        
        // Draw term
        page.drawText(term, {
          x: margin,
          y: y,
          size: 14,
          font: boldFont,
          color: { r: 0, g: 0, b: 0.6 }
        });
        y -= 20;
        
        // Draw definition (with word wrapping)
        const words = definition.split(' ');
        let line = '';
        for (const word of words) {
          const testLine = line + (line ? ' ' : '') + word;
          const lineWidth = font.widthOfTextAtSize(testLine, 12);
          
          if (lineWidth > contentWidth) {
            page.drawText(line, {
              x: margin + 10,
              y: y,
              size: 12,
              font: font,
              color: { r: 0, g: 0, b: 0 }
            });
            line = word;
            y -= 18;
            
            // Check if we need a new page
            if (y < 100) {
              page = pdfDoc.addPage();
              y = height - margin;
            }
          } else {
            line = testLine;
          }
        }
        
        // Draw the last line
        if (line) {
          page.drawText(line, {
            x: margin + 10,
            y: y,
            size: 12,
            font: font,
            color: { r: 0, g: 0, b: 0 }
          });
          y -= 30;
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `jargon-glossary-${Date.now()}.pdf`);
    } catch (error) { 
      console.error('Export Error: PDF generation failed:', error); 
      alert('Failed to generate PDF.'); 
    }
    setIsExporting(false);
  };

  // Load jargon data
  useEffect(() => {
    setJargonGlossary(defaultJargon);
    if (currentUser) {
      loadCustomJargon();
    }
  }, [currentUser]);

  // Create translated transcript with jargon highlighted and defined
  useEffect(() => {
    if (transcriptEntries.length > 0) {
      const combinedGlossary = { ...jargonGlossary, ...customJargon };
      const translated = transcriptEntries.map(entry => {
        const words = entry.text.split(/\b/);
        const translatedWords = words.map((word, idx) => {
          const trimmedWord = word.trim();
          const upperWord = trimmedWord.toUpperCase();
          
          // Check if it's in our glossary
          if (trimmedWord && (combinedGlossary[trimmedWord] || combinedGlossary[upperWord])) {
            const definition = combinedGlossary[trimmedWord] || combinedGlossary[upperWord];
            return {
              original: word,
              isJargon: true,
              definition: definition
            };
          }
          return {
            original: word,
            isJargon: false
          };
        });
        
        return {
          ...entry,
          translatedWords
        };
      });
      
      setTranslatedTranscript(translated);
    } else {
      setTranslatedTranscript([]);
    }
  }, [transcriptEntries, jargonGlossary, customJargon]);

  // Add this useEffect to detect frequently used jargon without definitions
  useEffect(() => {
    if (!detectedJargon) return;
    
    // Find terms that appear frequently but don't have definitions
    const combined = { ...jargonGlossary, ...customJargon };
    const frequentUndefinedTerms = Object.entries(detectedJargon)
      .filter(([term, data]) => 
        // Term appears 3+ times, isn't defined yet, and hasn't been suggested
        data.count >= 3 && !combined[term] && !data.suggested
      )
      .sort((a, b) => b[1].count - a[1].count); // Sort by frequency
    
    if (frequentUndefinedTerms.length > 0) {
      const [term, data] = frequentUndefinedTerms[0];
      setSuggestedTerm(term);
      
      // Mark this term as suggested
      if (typeof setDetectedJargon === 'function') {
        setDetectedJargon(prev => ({
          ...prev,
          [term]: {
            ...prev[term],
            suggested: true
          }
        }));
      }
    }
  }, [detectedJargon, jargonGlossary, customJargon]);

  // Load custom jargon from Firestore
  const loadCustomJargon = async () => {
    try {
      const jargonCollectionRef = collection(db, 'users', currentUser.uid, 'jargon');
      const querySnapshot = await getDocs(jargonCollectionRef);
      
      const userJargon = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        userJargon[data.term] = data.definition;
      });
      
      setCustomJargon(userJargon);
    } catch (error) {
      console.error("Error loading custom jargon:", error);
    }
  };

  // Add a new term to the custom jargon
  const addCustomTerm = async () => {
    if (!newTerm.trim() || !newDefinition.trim()) return;
    
    try {
      const term = newTerm.trim();
      const definition = newDefinition.trim();
      
      // Add to Firestore if user is logged in
      if (currentUser) {
        const jargonCollectionRef = collection(db, 'users', currentUser.uid, 'jargon');
        await addDoc(jargonCollectionRef, {
          term,
          definition,
          createdAt: serverTimestamp()
        });
      }
      
      // Update local state
      setCustomJargon(prev => ({
        ...prev,
        [term]: definition
      }));
      
      // Reset form
      setNewTerm('');
      setNewDefinition('');
      setIsAddingTerm(false);
    } catch (error) {
      console.error("Error adding custom term:", error);
    }
  };

  // Filter glossary based on search term
  const filteredGlossary = () => {
    const combined = { ...jargonGlossary, ...customJargon };
    if (!searchTerm) return combined;
    
    return Object.keys(combined)
      .filter(term => 
        term.toLowerCase().includes(searchTerm.toLowerCase()) || 
        combined[term].toLowerCase().includes(searchTerm.toLowerCase())
      )
      .reduce((filtered, key) => {
        filtered[key] = combined[key];
        return filtered;
      }, {});
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-indigo-50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-indigo-800">Jargon Translator</h3>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={highlightJargon}
                onChange={() => setHighlightJargon(!highlightJargon)}
                className="mr-1 h-4 w-4 text-indigo-600 rounded"
              />
              Highlight Jargon
            </label>
            <button
              onClick={() => glossaryRef.current.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            >
              View Glossary
            </button>
          </div>
        </div>
      </div>

      {/* Translated Transcript Section */}
      <div className="p-4 max-h-96 overflow-y-auto pretty-scrollbar">
        {translatedTranscript.length === 0 ? (
          <p className="text-center text-gray-400 italic">No transcript to translate yet...</p>
        ) : (
          translatedTranscript.map((entry, index) => (
            <div key={`${entry.timestamp}-${index}`} className="mb-4 last:mb-0">
              <div className="flex items-start mb-1">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 shadow-sm ${
                  (typeof entry.speaker === 'number' ? entry.speaker : 0) % 3 === 0 ? 'bg-purple-100 text-purple-800' :
                  (typeof entry.speaker === 'number' ? entry.speaker : 0) % 3 === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  <span className="font-medium text-sm">{typeof entry.speaker === 'number' ? entry.speaker : '?'}</span>
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-700 text-sm">
                    Speaker {typeof entry.speaker === 'number' ? entry.speaker : '?'}
                  </span>
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {entry.translatedWords.map((word, idx) => (
                      <span key={idx}>
                        {word.isJargon && highlightJargon ? (
                          <span 
                            className="bg-yellow-100 px-0.5 rounded cursor-help border-b border-dashed border-yellow-400" 
                            title={word.definition}
                          >
                            {word.original}
                          </span>
                        ) : (
                          word.original
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Suggested Term Alert */}
        {suggestedTerm && (
          <div className="my-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-yellow-800">
                Frequent term detected: <strong>{suggestedTerm}</strong>
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setNewTerm(suggestedTerm);
                    setIsAddingTerm(true);
                    setSuggestedTerm(null);
                  }}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200"
                >
                  Add Definition
                </button>
                <button
                  onClick={() => setSuggestedTerm(null)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Glossary Section */}
      <div ref={glossaryRef} className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-gray-700">Jargon Glossary</h4>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Search glossary..."
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={exportGlossary}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200"
            >
              Export Glossary
            </button>
            {!isAddingTerm && (
              <button
                onClick={() => setIsAddingTerm(true)}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200"
              >
                Add Term
              </button>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search glossary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Add Term Form */}
        {isAddingTerm && (
          <div className="mb-4 p-3 bg-indigo-50 rounded-md">
            <h5 className="font-medium text-sm mb-2 text-indigo-700">Add New Term</h5>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Term (e.g., API)"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <textarea
                placeholder="Definition"
                value={newDefinition}
                onChange={(e) => setNewDefinition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows="2"
              ></textarea>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsAddingTerm(false)}
                  className="px-3 py-1 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={addCustomTerm}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                  disabled={!newTerm.trim() || !newDefinition.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Glossary List */}
        <div className="max-h-60 overflow-y-auto pretty-scrollbar">
          {Object.keys(filteredGlossary()).length === 0 ? (
            <p className="text-center text-gray-400 italic py-4">No matching terms found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(filteredGlossary())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([term, definition]) => (
                  <div key={term} className="p-2 bg-white rounded border border-gray-200 hover:shadow-sm">
                    <h5 className="font-medium text-indigo-700">{term}</h5>
                    <p className="text-sm text-gray-600">{definition}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pretty-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;}
        .pretty-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px;}
        .pretty-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px;}
        .pretty-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
      `}</style>
    </div>
  );
};

export default JargonTranslator;