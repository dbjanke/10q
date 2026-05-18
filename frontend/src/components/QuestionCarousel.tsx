import { Message } from '../types';
import { useState, useEffect, useRef } from 'react';
import './QuestionCarousel.css';

interface QuestionCarouselProps {
    questions: Message[];
    onSelectQuestion: (question: Message) => void;
    disabled?: boolean;
}

export default function QuestionCarousel({ questions, onSelectQuestion, disabled }: QuestionCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const hasQuestions = questions.length > 0;
    const currentActiveIndex = hasQuestions ? Math.min(activeIndex, questions.length - 1) : 0;

    // Select the active question whenever it changes
    useEffect(() => {
        if (!hasQuestions) {
            return;
        }

        const activeQuestion = questions.find((_question, index) => index === currentActiveIndex);
        if (!activeQuestion) {
            return;
        }

        onSelectQuestion(activeQuestion);
    }, [currentActiveIndex, hasQuestions, onSelectQuestion, questions]);

    // Keep the selected card visually centered in the horizontal track.
    useEffect(() => {
        if (!hasQuestions || !trackRef.current) {
            return;
        }

        const activeSlide = trackRef.current.querySelector<HTMLDivElement>(
            `[data-carousel-index="${String(currentActiveIndex)}"]`
        );
        if (!activeSlide) {
            return;
        }

        activeSlide.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
        });
    }, [currentActiveIndex, hasQuestions]);

    if (!hasQuestions) {
        return null;
    }

    const handlePrev = () => {
        if (disabled) return;
        setActiveIndex((prevIndex) => (prevIndex === 0 ? questions.length - 1 : prevIndex - 1));
    };

    const handleNext = () => {
        if (disabled) return;
        setActiveIndex((prevIndex) => (prevIndex === questions.length - 1 ? 0 : prevIndex + 1));
    };

    return (
        <div className="question-carousel">
            <div className="carousel-track" ref={trackRef}>
                {questions.map((question, index) => {
                    const isActive = index === currentActiveIndex;

                    return (
                        <div
                            key={question.id}
                            data-carousel-index={index}
                            className={`carousel-slide ${isActive ? 'active' : ''}`}
                            onClick={() => { if (!disabled) setActiveIndex(index); }}
                            style={{
                                opacity: isActive ? 1 : 0.5,
                                transform: isActive ? 'scale(1)' : 'scale(0.9)',
                                transition: 'all 0.3s ease-in-out',
                            }}
                        >
                            <div className="card question-card">
                                <p className="question-content">{question.content}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {questions.length > 1 && (
                <div className="carousel-controls">
                    <button
                        className="carousel-button carousel-button-prev"
                        onClick={handlePrev}
                        disabled={disabled}
                        aria-label="Previous question"
                        title="Previous question"
                    >
                        ←
                    </button>
                    <div className="carousel-indicators">
                        {questions.map((_, index) => (
                            <button
                                key={index}
                                className={`indicator ${index === currentActiveIndex ? 'active' : ''}`}
                                onClick={() => { if (!disabled) setActiveIndex(index); }}
                                aria-label={`Question ${index + 1}`}
                                aria-current={index === currentActiveIndex}
                            />
                        ))}
                    </div>
                    <button
                        className="carousel-button carousel-button-next"
                        onClick={handleNext}
                        disabled={disabled}
                        aria-label="Next question"
                        title="Next question"
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
}
