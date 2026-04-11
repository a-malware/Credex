import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { presentationData as data } from './Data';
import './Slides.css';

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < data.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const slide = data.slides[currentSlide];

  return (
    <div className="presentation-container">
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${((currentSlide + 1) / data.slides.length) * 100}%` }}
        ></div>
      </div>

      <div className="slide-wrapper">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="slide-card"
          >
            {renderSlideContent(slide)}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="controls">
        <div className="slide-info">
          <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{currentSlide + 1}</span>
          <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>/</span>
          <span style={{ color: 'var(--text-dim)' }}>{data.slides.length}</span>
          <span style={{ marginLeft: '20px', fontSize: '0.9rem', color: 'var(--text-dim)', opacity: 0.5 }}>
            {slide.title}
          </span>
        </div>
        <div className="nav-group">
          <button className="nav-btn" onClick={prevSlide} disabled={currentSlide === 0} style={{ marginRight: '12px' }}>
            Back
          </button>
          <button className="nav-btn" style={{ background: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={nextSlide} disabled={currentSlide === data.slides.length - 1}>
            {currentSlide === data.slides.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderSlideContent(slide) {
  switch (slide.type) {
    case 'title':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="slide-title" 
            style={{ fontSize: '4.5rem', textAlign: 'center' }}
          >
            {slide.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ textAlign: 'center', fontSize: '1.5rem', color: 'var(--secondary)', marginBottom: '60px' }}
          >
            {slide.content}
          </motion.p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px', marginTop: 'auto' }}>
            <div>
              <h3 style={{ color: 'var(--secondary)', marginBottom: '10px' }}>Team Members</h3>
              {data.authors.map(a => (
                <div key={a.roll} style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span style={{ color: 'var(--text-dim)', marginLeft: '10px', fontSize: '0.9rem' }}>({a.roll})</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ color: 'var(--secondary)', marginBottom: '10px' }}>Project Guide</h3>
              <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{data.guide}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{data.department}</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{data.institution}</p>
            </div>
          </div>
        </div>
      );

    case 'list':
      return (
        <div>
          <h1 className="slide-title">{slide.title}</h1>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '40px' }}>
            {slide.items.map((item, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                style={{ 
                  fontSize: '1.4rem', 
                  padding: '12px 20px', 
                  marginBottom: '10px', 
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  borderLeft: '4px solid var(--primary)'
                }}
              >
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      );

    case 'content':
      return (
        <div>
          <h1 className="slide-title">{slide.title}</h1>
          <p className="slide-content">{slide.content}</p>
          {slide.highlights && (
            <div className="highlight-grid">
              {slide.highlights.map((h, i) => (
                <motion.div 
                  key={i} 
                  className="highlight-item"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                >
                  {h}
                </motion.div>
              ))}
            </div>
          )}
          {slide.table && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {slide.table[0].map((h, i) => <th key={i}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slide.table.slice(1).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );

    case 'diagram':
      return (
        <div>
          <h1 className="slide-title">{slide.title}</h1>
          <p className="slide-content">{slide.description}</p>
          <div className="diagram-container">
            {slide.steps.map((step, i) => (
              <motion.div 
                key={i} 
                className="diagram-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + (i * 0.2) }}
              >
                <div className="step-phase">{step.phase}</div>
                <div className="step-name">{step.name}</div>
                <div className="step-detail">{step.detail}</div>
              </motion.div>
            ))}
          </div>
          <div style={{ marginTop: '40px', textAlign: 'center', opacity: 0.5 }}>
            <motion.div
              animate={{ x: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Phase 1 → Phase 2 → Phase 3 → Graduation
            </motion.div>
          </div>
        </div>
      );

    case 'timeline':
      return (
        <div>
          <h1 className="slide-title">{slide.title}</h1>
          <div style={{ position: 'relative', marginTop: '60px', paddingLeft: '40px' }}>
            <div style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '2px', background: 'var(--primary)' }}></div>
            {slide.items.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                style={{ marginBottom: '40px', position: 'relative' }}
              >
                <div style={{ 
                  position: 'absolute', 
                  left: '-47px', 
                  top: '0', 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: 'var(--bg-dark)',
                  border: '3px solid var(--secondary)'
                }}></div>
                <div style={{ fontSize: '1.1rem', color: 'var(--secondary)', fontWeight: 700, marginBottom: '5px' }}>{item.period}</div>
                <div style={{ fontSize: '1.4rem' }}>{item.activity}</div>
              </motion.div>
            ))}
          </div>
        </div>
      );

    default:
      return <div>Unknown slide type</div>;
  }
}
