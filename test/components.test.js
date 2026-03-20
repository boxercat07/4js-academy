const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Read the components.js file
const componentsJs = fs.readFileSync(path.resolve(__dirname, '../app/components.js'), 'utf8');

let dom, window;

beforeAll(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        runScripts: 'dangerously',
        resources: 'usable',
        url: 'http://localhost:3000'
    });
    window = dom.window;

    global.window = window;
    global.document = window.document;
    global.HTMLElement = window.HTMLElement;
    global.customElements = window.customElements;
    global.Node = window.Node;
    global.CustomEvent = window.CustomEvent;
    global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: { role: 'USER' } })
    }));

    const script = window.document.createElement('script');
    script.textContent = componentsJs;
    window.document.head.appendChild(script);
});

// ---------------------------------------------------------------------------
// Basic Rendering
// ---------------------------------------------------------------------------
describe('Web Components Rendering', () => {
    test('AiModule renders with step and title', () => {
        const el = window.document.createElement('ai-module');
        el.setAttribute('step', '01');
        el.setAttribute('title', 'Test');
        window.document.body.appendChild(el);
        expect(el.innerHTML).toContain('Module 01');
        el.remove();
    });

    test('AiContentItem renders with title and type', () => {
        const el = window.document.createElement('ai-content-item');
        el.setAttribute('title', 'Lesson 1');
        el.setAttribute('type', 'PDF');
        window.document.body.appendChild(el);
        expect(el.innerHTML).toContain('Lesson 1');
        expect(el.innerHTML).toContain('PDF');
        el.remove();
    });
});

// ---------------------------------------------------------------------------
// AiQuiz Helper: getOptionText
// ---------------------------------------------------------------------------
describe('AiQuiz.getOptionText', () => {
    let quiz;

    beforeEach(() => {
        quiz = window.document.createElement('ai-quiz');
    });

    test('returns string options as-is', () => {
        expect(quiz.getOptionText('Hello')).toBe('Hello');
    });

    test('converts numbers to string', () => {
        expect(quiz.getOptionText(42)).toBe('42');
    });

    test('extracts "text" key from object', () => {
        expect(quiz.getOptionText({ text: 'Answer A', correct: true })).toBe('Answer A');
    });

    test('extracts "option" key from object', () => {
        expect(quiz.getOptionText({ option: 'Choice B' })).toBe('Choice B');
    });

    test('extracts "content" key from object', () => {
        expect(quiz.getOptionText({ content: 'Item C', isCorrect: false })).toBe('Item C');
    });

    test('extracts "label" key from object', () => {
        expect(quiz.getOptionText({ label: 'Label D' })).toBe('Label D');
    });

    test('ignores boolean values for answer key', () => {
        // Should not return "true" for { answer: true }, should fallback
        const result = quiz.getOptionText({ answer: true, text: 'Real text' });
        expect(result).toBe('Real text');
    });

    test('falls back to first string property', () => {
        expect(quiz.getOptionText({ id: 1, name: 'Fallback' })).toBe('Fallback');
    });

    test('falls back to JSON.stringify for unknown objects', () => {
        const result = quiz.getOptionText({ id: 1, val: 2 });
        expect(result).toContain('"id"');
    });
});

// ---------------------------------------------------------------------------
// AiQuiz Helper: getCorrectAnswerIndex
// ---------------------------------------------------------------------------
describe('AiQuiz.getCorrectAnswerIndex', () => {
    let quiz;

    beforeEach(() => {
        quiz = window.document.createElement('ai-quiz');
    });

    test('returns null for missing question', () => {
        expect(quiz.getCorrectAnswerIndex(null)).toBeNull();
    });

    test('returns null for question without options', () => {
        expect(quiz.getCorrectAnswerIndex({ question: 'Q?' })).toBeNull();
    });

    test('detects numeric index from q.answer', () => {
        const q = { question: 'Q?', options: ['A', 'B', 'C'], answer: 1 };
        expect(quiz.getCorrectAnswerIndex(q)).toBe(1);
    });

    test('detects string-matching answer', () => {
        const q = {
            question: 'Q?',
            options: [{ option: 'Yes' }, { option: 'No' }],
            answer: 'Yes'
        };
        expect(quiz.getCorrectAnswerIndex(q)).toBe(0);
    });

    test('detects correct:true flag inside options', () => {
        const q = {
            question: 'Q?',
            options: [
                { text: 'Wrong' },
                { text: 'Right', correct: true },
                { text: 'Also Wrong' }
            ]
        };
        expect(quiz.getCorrectAnswerIndex(q)).toBe(1);
    });

    test('detects isCorrect:true flag inside options', () => {
        const q = {
            question: 'Q?',
            options: [
                { text: 'A' },
                { text: 'B', isCorrect: true }
            ]
        };
        expect(quiz.getCorrectAnswerIndex(q)).toBe(1);
    });

    test('works with "choices" key instead of "options"', () => {
        const q = {
            question: 'Q?',
            choices: [
                { content: 'X' },
                { content: 'Y', correct: true }
            ]
        };
        expect(quiz.getCorrectAnswerIndex(q)).toBe(1);
    });

    test('detects correctAnswerIndex key', () => {
        const q = { question: 'Q?', options: ['A', 'B', 'C'], correctAnswerIndex: 2 };
        expect(quiz.getCorrectAnswerIndex(q)).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// AiQuiz: Best Score Persistence
// ---------------------------------------------------------------------------
describe('AiQuiz Best Score Persistence', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test('saves first attempt score', () => {
        const quizId = 'quiz-results-Test Quiz';
        expect(window.localStorage.getItem(quizId)).toBeNull();

        // Simulate saving a result
        window.localStorage.setItem(quizId, JSON.stringify({ score: 67, passed: false }));
        const result = JSON.parse(window.localStorage.getItem(quizId));
        expect(result.score).toBe(67);
    });

    test('keeps higher score over lower score', () => {
        const quizId = 'quiz-results-Test Quiz';
        window.localStorage.setItem(quizId, JSON.stringify({ score: 100, passed: true }));

        // Simulate the best-score logic
        const previous = JSON.parse(window.localStorage.getItem(quizId));
        const newScore = 50;
        if (!previous || newScore > previous.score) {
            window.localStorage.setItem(quizId, JSON.stringify({ score: newScore, passed: false }));
        }

        const result = JSON.parse(window.localStorage.getItem(quizId));
        expect(result.score).toBe(100); // Should keep the 100
    });

    test('overwrites lower score with higher score', () => {
        const quizId = 'quiz-results-Test Quiz';
        window.localStorage.setItem(quizId, JSON.stringify({ score: 50, passed: false }));

        const previous = JSON.parse(window.localStorage.getItem(quizId));
        const newScore = 80;
        if (!previous || newScore > previous.score) {
            window.localStorage.setItem(quizId, JSON.stringify({ score: newScore, passed: true }));
        }

        const result = JSON.parse(window.localStorage.getItem(quizId));
        expect(result.score).toBe(80);
        expect(result.passed).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// AiContentItem: Quiz Status Rendering
// ---------------------------------------------------------------------------
describe('AiContentItem Quiz Status', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test('renders "Passed" badge when quiz results exist', () => {
        window.localStorage.setItem('quiz-results-My Quiz', JSON.stringify({ score: 90, passed: true }));

        const el = window.document.createElement('ai-content-item');
        el.setAttribute('title', 'My Quiz');
        el.setAttribute('type', 'QUIZ');
        window.document.body.appendChild(el);

        expect(el.innerHTML).toContain('90%');
        expect(el.innerHTML).toContain('Passed');
        el.remove();
    });

    test('renders "To Retake" badge when quiz was failed', () => {
        window.localStorage.setItem('quiz-results-Failed Quiz', JSON.stringify({ score: 30, passed: false }));

        const el = window.document.createElement('ai-content-item');
        el.setAttribute('title', 'Failed Quiz');
        el.setAttribute('type', 'QUIZ');
        window.document.body.appendChild(el);

        expect(el.innerHTML).toContain('30%');
        expect(el.innerHTML).toContain('To Retake');
        el.remove();
    });

    test('renders no badge when no quiz results exist', () => {
        const el = window.document.createElement('ai-content-item');
        el.setAttribute('title', 'New Quiz');
        el.setAttribute('type', 'QUIZ');
        window.document.body.appendChild(el);

        expect(el.innerHTML).not.toContain('Passed');
        expect(el.innerHTML).not.toContain('To Retake');
        el.remove();
    });

    test('non-quiz items never show quiz badge', () => {
        window.localStorage.setItem('quiz-results-PDF Item', JSON.stringify({ score: 100, passed: true }));

        const el = window.document.createElement('ai-content-item');
        el.setAttribute('title', 'PDF Item');
        el.setAttribute('type', 'PDF');
        window.document.body.appendChild(el);

        expect(el.innerHTML).not.toContain('Passed');
        el.remove();
    });
});

// ---------------------------------------------------------------------------
// AiModule: Content Locking
// ---------------------------------------------------------------------------
describe('AiModule Content Locking', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    test('locks items after an unpassed quiz', () => {
        const mod = window.document.createElement('ai-module');
        mod.setAttribute('step', '01');
        mod.setAttribute('title', 'Lock Test');
        mod.innerHTML = `
            <ai-content-item title="PDF 1" type="PDF"></ai-content-item>
            <ai-content-item title="Gate Quiz" type="QUIZ"></ai-content-item>
            <ai-content-item title="Video 1" type="VIDEO"></ai-content-item>
        `;
        window.document.body.appendChild(mod);

        // Video after the unpassed quiz should be locked
        const video = mod.querySelector('ai-content-item[title="Video 1"]');
        expect(video.hasAttribute('locked')).toBe(true);
        mod.remove();
    });

    test('unlocks items after a passed quiz', () => {
        window.localStorage.setItem('quiz-results-Gate Quiz', JSON.stringify({ score: 100, passed: true }));
        window.localStorage.setItem('quiz-passed-Gate Quiz', 'true');

        const mod = window.document.createElement('ai-module');
        mod.setAttribute('step', '01');
        mod.setAttribute('title', 'Unlock Test');
        mod.innerHTML = `
            <ai-content-item title="PDF 1" type="PDF"></ai-content-item>
            <ai-content-item title="Gate Quiz" type="QUIZ"></ai-content-item>
            <ai-content-item title="Video 1" type="VIDEO"></ai-content-item>
        `;
        window.document.body.appendChild(mod);

        const video = mod.querySelector('ai-content-item[title="Video 1"]');
        expect(video.hasAttribute('locked')).toBe(false);
        mod.remove();
    });
});
