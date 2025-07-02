import { useParams, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Volume2, Calendar, MapPin, Zap } from 'lucide-react';
import brandsData from '@/data/brands.json';

interface Brand {
  name: string;
  pronunciation: string;
  phonemes: string;
  country: string;
  founded: string;
  description: string;
}

const brands = brandsData as Brand[];

export default function BrandDetails() {
  const { name } = useParams();
  const brandName = decodeURIComponent(name || '');
  const brand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());

  if (!brand) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Brand Not Found
              </h1>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                The car brand "{brandName}" was not found in our database.
              </p>
              <Link href="/search">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Search
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const playPronunciation = () => {
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

  const phonemeList = brand.phonemes.split('-').map(p => p.trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/search">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Brand Details
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Brand Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Brand Header */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl text-slate-900 dark:text-white">
                      {brand.name}
                    </CardTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="secondary" className="text-sm">
                        <MapPin className="w-3 h-3 mr-1" />
                        {brand.country}
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        <Calendar className="w-3 h-3 mr-1" />
                        Founded {brand.founded}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Brand Image Placeholder */}
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                      {brand.name.charAt(0)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                  {brand.description}
                </p>
                
                <div className="mt-6">
                  <Link href="/ai-feedback">
                    <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                      <Zap className="w-5 h-5 mr-2" />
                      Practice Pronunciation with AI
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Brand History & Facts */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Brand History & Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      Founded
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300">
                      {brand.founded} in {brand.country}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      Origin
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300">
                      {brand.country}
                    </p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      About
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300">
                      {brand.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pronunciation Guide */}
          <div className="space-y-6">
            {/* Pronunciation */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Pronunciation Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <Button
                    onClick={playPronunciation}
                    size="lg"
                    variant="outline"
                    className="w-full mb-4"
                  >
                    <Volume2 className="w-5 h-5 mr-2" />
                    Play Pronunciation
                  </Button>
                  
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {brand.pronunciation}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Click the button above to hear the correct pronunciation
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Phoneme Breakdown */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Phoneme Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    Break down the pronunciation into these sounds:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {phonemeList.map((phoneme, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-center"
                      >
                        <div className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                          {phoneme}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Sound {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Tip:</strong> Practice each sound separately, then combine them slowly. 
                      Use the AI practice mode for personalized feedback!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-300">Syllables</span>
                    <Badge variant="outline">{phonemeList.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-300">Difficulty</span>
                    <Badge variant={phonemeList.length <= 2 ? "secondary" : phonemeList.length <= 4 ? "default" : "destructive"}>
                      {phonemeList.length <= 2 ? "Easy" : phonemeList.length <= 4 ? "Medium" : "Hard"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-300">Origin</span>
                    <Badge variant="outline">{brand.country}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}