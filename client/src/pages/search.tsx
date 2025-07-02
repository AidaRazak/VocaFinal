import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Mic, Volume2, AlertCircle, X, Brain, ArrowLeft } from 'lucide-react';
import brandsData from '../data/brands.json';

interface Brand {
  name: string;
  pronunciation: string;
  phonemes: string;
  country: string;
  founded: string;
  description: string;
}

const allBrands: Brand[] = brandsData;

function normalizeBrand(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getClosestBrands(input: string, allBrands: Brand[], maxDistance = 3): Brand[] {
  const normalizedInput = normalizeBrand(input);
  
  if (!normalizedInput) return [];
  
  const results = allBrands.filter(brand => {
    const normalizedBrand = normalizeBrand(brand.name);
    return normalizedBrand.includes(normalizedInput) || 
           normalizedInput.includes(normalizedBrand) ||
           levenshteinDistance(normalizedInput, normalizedBrand) <= maxDistance;
  });
  
  return results.slice(0, 10);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Brand[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Brand[]>([]);
  const [, navigate] = useLocation();

  // Simple search function for non-AI section
  const performSimpleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSuggestions([]);
      return;
    }
    // Prioritize exact and prefix matches
    const normalizedInput = normalizeBrand(query);
    let sorted = allBrands
      .map(brand => ({
        brand,
        score: normalizeBrand(brand.name) === normalizedInput ? 0 :
               normalizeBrand(brand.name).startsWith(normalizedInput) ? 1 :
               normalizeBrand(brand.name).includes(normalizedInput) ? 2 :
               levenshteinDistance(normalizedInput, normalizeBrand(brand.name)) + 3
      }))
      .sort((a, b) => a.score - b.score)
      .map(x => x.brand);
    setSearchResults(sorted.slice(0, 10));
    setSuggestions(sorted.slice(0, 5));
  };

  // Simple voice search using Web Speech API (no AI)
  const startSimpleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      performSimpleSearch(transcript);
      setIsRecording(false);
    };
    
    recognition.onerror = (event: any) => {
      setError('Voice search failed. Please try again.');
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognition.start();
  };

  const playPronunciation = (brand: Brand) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(brand.name);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Add event listeners for debugging
      utterance.onstart = () => console.log(`Speech started for: ${brand.name}`);
      utterance.onend = () => console.log(`Speech ended for: ${brand.name}`);
      utterance.onerror = (event) => console.error('Speech error:', event);
      
      // Speak with a small delay to ensure it works
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-offwhite to-cream font-jakarta">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate('/dashboard')}
            className="flex items-center gap-2 mb-6 px-4 py-2 bg-navy text-gold rounded-lg shadow hover:bg-gold hover:text-navy font-jakarta font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-navy font-playfair">
              Start Learning
            </h1>
            <p className="text-teal text-lg md:text-xl">
              Choose your learning path to master car brand pronunciations
            </p>
          </div>

          {/* AI Practice Section */}
          <div className="glassmorphic rounded-3xl p-8 mb-8 bg-gradient-to-r from-navy/10 to-teal/10 backdrop-blur-lg border border-gold/30 shadow-2xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4 text-navy font-playfair">
                🧠 AI Practice
              </h2>
              <p className="text-teal mb-6 text-lg leading-relaxed">
                Get detailed AI feedback on your pronunciation with accuracy scoring and phoneme analysis
              </p>
              <Link
                href="/ai-feedback"
                className="inline-block px-8 py-4 bg-navy hover:bg-teal text-gold border-2 border-gold font-bold rounded-full shadow-xl transform hover:scale-105 transition-all duration-300 text-lg"
              >
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6" />
                  Start AI Practice Session
                </div>
              </Link>
            </div>
          </div>

          {/* Separator */}
          <div className="flex items-center my-8">
            <div className="flex-1 border-t border-gold/30"></div>
            <div className="px-6 text-teal font-semibold text-lg">OR</div>
            <div className="flex-1 border-t border-gold/30"></div>
          </div>

          {/* Simple Search Section */}
          <div className="glassmorphic rounded-3xl p-8 mb-8 bg-white/60 backdrop-blur-lg border border-gold/20 shadow-2xl">
            <h2 className="text-3xl font-bold mb-4 text-navy font-playfair">
              🔍 Say the Word
            </h2>
            <p className="text-teal mb-6 text-lg leading-relaxed">
              Search for car brands to view details and hear correct pronunciations
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1" style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Type a car brand name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    performSimpleSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => { if (searchTerm.trim()) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="w-full px-4 py-3 border-2 border-gold/30 rounded-full focus:ring-2 focus:ring-teal focus:border-teal bg-white/80 backdrop-blur-sm text-navy placeholder-teal/60 font-medium"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 bg-white border border-gold/20 rounded-xl shadow-lg mt-2 max-h-60 overflow-y-auto">
                    {suggestions.map((brand) => (
                      <li
                        key={brand.name}
                        className="px-4 py-2 hover:bg-teal/10 cursor-pointer text-navy"
                        onMouseDown={() => {
                          setSearchTerm(brand.name);
                          performSimpleSearch(brand.name);
                          setShowSuggestions(false);
                        }}
                      >
                        {brand.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={startSimpleVoiceSearch}
                disabled={isRecording}
                className={`px-6 py-3 rounded-full font-semibold transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white cursor-not-allowed border-2 border-red-600'
                    : 'bg-teal hover:bg-navy text-white border-2 border-teal hover:border-navy'
                }`}
              >
                {isRecording ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    Listening...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Voice Search
                  </div>
                )}
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl glassmorphic">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700 font-semibold">Search failed</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          {searchResults.length > 0 && (
            <div className="glassmorphic rounded-3xl p-8 bg-white/40 backdrop-blur-lg border border-gold/20 shadow-2xl">
              <h2 className="text-3xl font-bold mb-6 text-navy font-playfair">Search Results</h2>
              <div className="grid gap-6">
                {searchResults.map((brand) => (
                  <div key={brand.name} className="p-6 bg-white/60 border-2 border-gold/20 rounded-2xl hover:shadow-lg transition-all duration-300 glassmorphic">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-navy mb-3 font-playfair">{brand.name}</h3>
                        <p className="text-teal mb-2 font-medium">
                          <strong>Country:</strong> {brand.country}
                        </p>
                        <p className="text-teal mb-2 font-medium">
                          <strong>Founded:</strong> {brand.founded}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 ml-4">
                        <button
                          onClick={() => playPronunciation(brand)}
                          className="px-6 py-3 bg-teal hover:bg-navy text-white rounded-full transition-all duration-300 flex items-center gap-2 font-semibold hover:scale-105 shadow-lg"
                        >
                          <Volume2 className="w-4 h-4" />
                          Say the Word
                        </button>
                        <Link
                          href={`/brand/${encodeURIComponent(brand.name)}`}
                          className="px-6 py-3 bg-navy hover:bg-teal text-gold border-2 border-gold rounded-full transition-all duration-300 text-center font-semibold hover:scale-105 shadow-lg"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}