import { motion } from 'framer-motion';
import { Link } from 'wouter';

export default function Landing() {
  const steps = [
    {
      icon: '📝',
      title: 'Sign Up',
      desc: 'Create your account and start your pronunciation journey',
    },
    {
      icon: '🎤',
      title: 'Practice',
      desc: 'Record your pronunciation and get instant AI feedback',
    },
    {
      icon: '🎮',
      title: 'Play Games',
      desc: 'Test your knowledge in our fun educational games',
    },
    {
      icon: '📈',
      title: 'Track Progress',
      desc: 'Monitor your improvement with detailed analytics',
    },
  ];

  const features = [
    {
      icon: '🎯',
      title: 'AI-Powered Feedback',
      desc: 'Get detailed phoneme-by-phoneme analysis with confidence scores and improvement tips.',
    },
    {
      icon: '🎮',
      title: 'Gamified Learning',
      desc: 'Three exciting game modes: Phoneme Challenge, Listen & Guess, and AI Pronunciation Showdown.',
    },
    {
      icon: '📊',
      title: 'Progress Tracking',
      desc: 'Track your daily streaks, accuracy improvements, and brands learned with detailed analytics.',
    },
  ];

  const testimonials = [
    {
      name: 'Aisha',
      quote: 'Voca made pronunciation practice fun and effective! The games and feedback are amazing.',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    },
    {
      name: 'Liam',
      quote: 'I love tracking my progress and seeing real improvement every week.',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    },
    {
      name: 'Sofia',
      quote: 'The AI feedback is so detailed, it feels like having a personal coach.',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    },
  ];

  return (
    <div className="font-jakarta relative overflow-x-hidden bg-background text-foreground">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gold/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-black/10 rounded-full blur-2xl animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 glassmorphic backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-playfair font-bold text-gold tracking-tight">Voca</h1>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/login">
              <button className="text-gray-700 hover:text-gold transition font-medium">Log In</button>
            </Link>
            <Link href="/signup">
              <button className="px-6 py-2 bg-gold text-black rounded-full hover:bg-gold-light transition font-semibold">Sign Up</button>
            </Link>
          </div>
          <div className="md:hidden">
            <Link href="/signup">
              <button className="px-4 py-2 bg-gold text-black rounded-full hover:bg-gold-light transition font-semibold text-sm">Get Started</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-black/90 to-gray-900/90 text-white px-4 relative pt-28"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="text-center animate-slide-up z-10">
          <h1 className="text-6xl md:text-7xl font-playfair font-extrabold mb-6 text-gold drop-shadow-2xl">Voca</h1>
          <h2 className="text-3xl md:text-5xl font-playfair font-bold mb-6 text-white drop-shadow-lg">Master Word Pronunciation with Confidence</h2>
          <p className="text-xl md:text-2xl font-jakarta mb-10 max-w-3xl text-white/90 leading-relaxed mx-auto">The smart, intuitive way to improve your pronunciation powered by AI, tailored for learners of all levels.</p>
          <Link href="/signup">
            <button className="px-12 py-4 rounded-full bg-gold hover:bg-gold-light text-black font-bold text-xl shadow-2xl hover:scale-105 transition-all duration-300 mb-8">Start Practicing</button>
          </Link>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-24 bg-white/95 backdrop-blur-md text-black relative z-10"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-16 text-center">Why Choose Voca?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((feature, i) => (
              <div key={i} className="glassmorphic rounded-2xl p-8 text-center hover:scale-105 transition-transform duration-300 shadow-lg">
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-playfair font-semibold mb-4">{feature.title}</h3>
                <p className="text-lg text-gray-700 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        className="py-24 bg-offwhite/95 backdrop-blur-md text-black relative z-10"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-16 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {steps.map((step, i) => (
              <div key={i} className="glassmorphic rounded-3xl p-10 hover:scale-105 transition-transform duration-300 relative overflow-hidden shadow-md">
                <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center text-3xl mb-6 shadow-lg">{step.icon}</div>
                <h3 className="text-2xl font-playfair font-bold mb-4">{step.title}</h3>
                <p className="text-lg text-gray-700 leading-relaxed">{step.desc}</p>
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gold/20 rounded-full blur-2xl"></div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section */}
      <motion.section
        className="py-20 bg-white/90 text-black relative z-10"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-12 text-center">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="glassmorphic rounded-2xl p-8 flex flex-col items-center text-center shadow-md">
                <img src={t.avatar} alt={t.name} className="w-20 h-20 rounded-full mb-4 border-4 border-gold object-cover" />
                <p className="text-lg italic mb-4">"{t.quote}"</p>
                <span className="font-bold text-gold">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-24 bg-gradient-to-r from-gold to-gold-light text-black relative z-10"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold mb-6">Ready to Master Car Brand Pronunciation?</h2>
          <p className="text-xl md:text-2xl font-jakarta mb-10 leading-relaxed">Join thousands of users who are already improving their pronunciation skills</p>
          <Link href="/signup">
            <button className="px-12 py-4 rounded-full bg-black/90 hover:bg-black text-gold font-bold text-xl shadow-2xl hover:scale-105 transition-all duration-300">Start Learning Now</button>
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-8 bg-black/90 text-gold text-center font-jakarta text-sm z-20 relative">
        &copy; {new Date().getFullYear()} Voca. All rights reserved.
      </footer>
    </div>
  );
}
