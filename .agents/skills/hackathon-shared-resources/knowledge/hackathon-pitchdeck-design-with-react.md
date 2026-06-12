# Designing Hackathon Pitch Decks with React (Genspark Style)

Instead of using traditional PowerPoint or Google Slides, top hackathon teams in 2026 build **interactive, web-based slide decks** using React. This approach allows you to run a working mock application or code preview directly inside your slides (similar to Genspark AI's interactive layout).

This guide details how to structure and style your React-based pitch deck.

---

## Design Principles (Genspark Style)

1. **Integrated Live Sandbox:** Embed interactive prototypes or mock UI interfaces right into the slide container. Judges can click and interact with your features without you switching tabs.
2. **Glassmorphism & Bento Layouts:** Use semi-transparent dark cards with subtle borders (`backdrop-filter: blur()`), glowing gradients, and grid-based layouts to present data.
3. **Smooth Micro-Animations:** Transition between slides with CSS transforms or Framer Motion to make the deck feel like a premium SaaS product.
4. **Dynamic Side Panel:** Keep slide control keys, timeline, and speaker notes/transcript in a collapsible sidebar or fixed HUD overlay.

---

## Slide Deck Component Architecture

Here is a recommended React file structure for the slide deck:

```
src/components/PitchDeck/
├── PitchDeckContainer.jsx  # Main state controller (current slide, navigation)
├── SidebarHUD.jsx          # Overlay controls, timer, and slide indicators
└── slides/
    ├── Slide1Hook.jsx      # Hook & Problem slide
    ├── Slide2Solution.jsx  # Solution card with interactive summary
    ├── Slide3Demo.jsx      # Embedded active prototype sandbox
    ├── Slide4TechStack.jsx # Interactive diagram of the tech stack
    └── Slide5Impact.jsx    # Metrics dashboard with dynamic counter animations
```

---

## Reference Implementation Code

Here is a minimal, production-grade template using React and Tailwind CSS:

```jsx
import React, { useState, useEffect } from 'react';

// Slide Data representing the 7-Slide Winning Framework
const SLIDES = [
  { id: 1, title: 'The Hook', component: Slide1Hook },
  { id: 2, title: 'The Solution', component: Slide2Solution },
  { id: 3, title: 'Interactive Demo', component: Slide3Demo },
  { id: 4, title: 'Tech Stack & APIs', component: Slide4TechStack },
  { id: 5, title: 'Value & Impact', component: Slide5Impact },
];

export default function PitchDeckContainer() {
  const [currentIdx, setCurrentIdx] = useState(0);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx]);

  const nextSlide = () => setCurrentIdx((prev) => Math.min(prev + 1, SLIDES.length - 1));
  const prevSlide = () => setCurrentIdx((prev) => Math.max(prev - 1, 0));

  const ActiveSlideComponent = SLIDES[currentIdx].component;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-pink-900/10 blur-[100px]" />

      {/* Main Slide Workspace */}
      <main className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-6xl aspect-[16/9] bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-12 flex flex-col justify-between shadow-2xl relative">
          <ActiveSlideComponent />
        </div>
      </main>

      {/* HUD Control Overlay */}
      <footer className="h-20 bg-slate-900/60 border-t border-slate-800/80 px-8 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex gap-2">
          {SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIdx ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
              aria-label={`Go to slide ${slide.title}`}
            />
          ))}
        </div>
        <div className="text-slate-400 text-sm font-mono">
          Slide {currentIdx + 1} of {SLIDES.length} : {SLIDES[currentIdx].title}
        </div>
        <div className="flex gap-4">
          <button
            onClick={prevSlide}
            disabled={currentIdx === 0}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-xl transition-all"
          >
            ← Prev
          </button>
          <button
            onClick={nextSlide}
            disabled={currentIdx === SLIDES.length - 1}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 rounded-xl transition-all font-semibold"
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  );
}

/* --- Slide Component Implementations --- */

function Slide1Hook() {
  return (
    <div className="flex flex-col justify-center h-full max-w-3xl">
      <span className="text-indigo-400 font-mono tracking-widest text-sm uppercase">The Crisis</span>
      <h1 className="text-5xl font-extrabold mt-4 mb-6 leading-tight tracking-tight bg-gradient-to-r from-slate-50 to-slate-400 bg-clip-text text-transparent">
        Waiting 6 Weeks for a Counselor While Anxiety Compounds Daily.
      </h1>
      <p className="text-slate-400 text-lg leading-relaxed">
        40% of college students live with chronic anxiety. Over half drop out of the counseling queue due to onboarding friction and endless delays.
      </p>
    </div>
  );
}

function Slide2Solution() {
  const [activeTab, setActiveTab] = useState('always-on');

  return (
    <div className="grid grid-cols-2 gap-8 h-full items-center">
      <div>
        <span className="text-indigo-400 font-mono text-sm uppercase">Our Solution</span>
        <h2 className="text-4xl font-bold mt-2 mb-4">Meet AnchorAI</h2>
        <p className="text-slate-400 leading-relaxed mb-6">
          A persistent companion that remembers your emotional journey, adapts its tone, and escalation triggers based on memory.
        </p>
        <div className="flex flex-col gap-2">
          {['always-on', 'context-aware', 'secure'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`p-3 text-left rounded-xl border transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600/10 border-indigo-500 text-slate-100'
                  : 'bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 h-64 flex flex-col justify-center items-center text-center shadow-inner">
        {activeTab === 'always-on' && <p className="text-slate-300">⚡ Instant response via edge-cached APIs (<100ms latency)</p>}
        {activeTab === 'context-aware' && <p className="text-slate-300">🧠 Summarized chat history injected into LLM context automatically</p>}
        {activeTab === 'secure' && <p className="text-slate-300">🔒 Zero-knowledge encryption for chat archives using PostgreSQL extensions</p>}
      </div>
    </div>
  );
}

function Slide3Demo() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Welcome back Alex. How was your chemistry exam?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input) return;
    const newMessages = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setInput('');

    // Simulate AI memory recall
    setTimeout(() => {
      setMessages([...newMessages, {
        sender: 'ai',
        text: 'That sounds exhausting. I recall you mentioning last week that physical chemistry feels overwhelming. Should we try a short breathing exercise?'
      }]);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-5 gap-8 h-full items-center">
      <div className="col-span-2">
        <span className="text-indigo-400 font-mono text-sm uppercase">Interactive Prototype</span>
        <h2 className="text-3xl font-bold mt-2 mb-4">Zero-friction Demo</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Test the memory mechanism directly. Type a response to show judges how AnchorAI recalls context from previous sessions.
        </p>
      </div>
      <div className="col-span-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col h-[320px] overflow-hidden shadow-2xl">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>AnchorAI Interface v1.0</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl max-w-[80%] ${
                msg.sender === 'ai'
                  ? 'bg-slate-900 text-slate-200 self-start'
                  : 'bg-indigo-600 text-slate-100 self-end'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type 'It went okay but I am still stressed'..."
            className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-100"
          />
          <button onClick={handleSend} className="bg-indigo-600 hover:bg-indigo-500 px-4 rounded-xl text-xs font-semibold transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function Slide4TechStack() {
  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <span className="text-indigo-400 font-mono text-sm uppercase">Under the Hood</span>
        <h2 className="text-3xl font-bold mt-2">Scalable & Lean Architecture</h2>
      </div>
      <div className="grid grid-cols-4 gap-4 my-auto">
        {[
          { title: 'Frontend', tech: 'Next.js / React', desc: 'Hosted on Vercel Edge' },
          { title: 'Routing API', tech: 'FastAPI / Python', desc: 'Docker container on Railway' },
          { title: 'AI Model', tech: 'Llama-3 via Groq', desc: 'Inference latency <100ms' },
          { title: 'Database', tech: 'Supabase / PG', desc: 'Vector search storage' }
        ].map((layer, i) => (
          <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-lg text-center hover:border-slate-700 transition-all">
            <span className="text-indigo-400 text-xs font-mono">{layer.title}</span>
            <h3 className="text-lg font-bold mt-2 mb-1 text-slate-200">{layer.tech}</h3>
            <p className="text-slate-400 text-xs">{layer.desc}</p>
          </div>
        ))}
      </div>
      <div className="text-slate-500 text-xs font-mono text-center">
        Zero unnecessary dependencies. Maximum load speed. Ready for production.
      </div>
    </div>
  );
}

function Slide5Impact() {
  return (
    <div className="grid grid-cols-2 gap-8 h-full items-center">
      <div>
        <span className="text-indigo-400 font-mono text-sm uppercase">Business Case</span>
        <h2 className="text-4xl font-bold mt-2 mb-4">Value Proposition</h2>
        <p className="text-slate-400 leading-relaxed">
          By deploying AnchorAI as a triaging system on college campuses, we reduce counseling wait times from weeks to minutes, optimizing administrative costs.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="text-4xl font-extrabold text-indigo-400">95%</div>
          <div className="text-slate-400 text-xs mt-2 uppercase font-mono">Wait Time Reduction</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="text-4xl font-extrabold text-indigo-400">$12k</div>
          <div className="text-slate-400 text-xs mt-2 uppercase font-mono">Saved per Month</div>
        </div>
      </div>
    </div>
  );
}
```
