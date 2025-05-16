const chapters = [
    { id: 'chapter1', title: 'الفصل الأول', file: 'Chapters/chapter1.json' },
    { id: 'chapter2', title: 'الفصل الثاني', file: 'Chapters/chapter2.json' },
    { id: 'chapter3', title: 'الفصل الثالث', file: 'Chapters/chapter3.json' }
];
let currentChapterIndex = 0;
let questions = [];
let mode = 'chapters';
let userAnswers = [];
let examHistory = JSON.parse(localStorage.getItem('examHistory')) || [];
let examQuestionCount = 50;
let modalCallback = null;
let promptCallback = null;

async function loadChapter() {
    try {
        const response = await fetch(chapters[currentChapterIndex].file);
        questions = await response.json();
        displayChapter();
    } catch (error) {
        console.error('Error loading questions:', error);
        document.getElementById('questionsContainer').innerText = 'خطأ في تحميل الأسئلة';
    }
}

async function loadExam() {
    showCustomPrompt();
}

async function proceedWithExam(count) {
    examQuestionCount = parseInt(count);
    try {
        const allQuestions = [];
        for (const chapter of chapters) {
            const response = await fetch(chapter.file);
            const chapterQuestions = await response.json();
            allQuestions.push(...chapterQuestions);
        }
        questions = allQuestions.sort(() => Math.random() - 0.5).slice(0, examQuestionCount);
        userAnswers = new Array(questions.length).fill(null);
        displayExam();
    } catch (error) {
        console.error('Error loading exam questions:', error);
        document.getElementById('questionsContainer').innerText = 'خطأ في تحميل الأسئلة';
    }
}

function displayChapter() {
    document.getElementById('chapterTitle').innerText = chapters[currentChapterIndex].title;
    document.getElementById('prevChapterBtn').disabled = currentChapterIndex === 0;
    document.getElementById('nextChapterBtn').disabled = currentChapterIndex === chapters.length - 1;
    document.getElementById('chapterHeader').style.display = 'flex';

    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        const imgSrc = question.answer
            ? 'Images/True.avif'
            : 'Images/False.avif';
        questionDiv.innerHTML = `
            <div class="question-text">${index + 1}. ${question.text}</div>
            <div class="result"><img src="${imgSrc}" alt="${question.answer ? 'Correct' : 'Wrong'}"></div>
        `;
        container.appendChild(questionDiv);
    });

    animateQuestions();
}

function displayExam() {
    document.getElementById('chapterTitle').innerText = `وضع الامتحان (${examQuestionCount} أسئلة)`;
    document.getElementById('prevChapterBtn').disabled = true;
    document.getElementById('nextChapterBtn').disabled = true;
    document.getElementById('chapterHeader').style.display = 'flex';

    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.innerHTML = `
            <div class="result" id="result-${index}"></div>
            <div class="question-text">${index + 1}. ${question.text}</div>
            <div class="options">
                <button class="option-btn" onclick="checkAnswer(${index}, true)">صح</button>
                <button class="option-btn" onclick="checkAnswer(${index}, false)">غلط</button>
            </div>
        `;
        container.appendChild(questionDiv);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'submit-btn';
    submitBtn.innerText = 'تسليم الامتحان';
    submitBtn.onclick = submitExam;
    container.appendChild(submitBtn);

    animateQuestions();
}

function checkAnswer(questionIndex, userAnswer) {
    const question = questions[questionIndex];
    const isCorrect = userAnswer === question.answer;
    userAnswers[questionIndex] = { userAnswer, isCorrect };
    const resultDiv = document.getElementById(`result-${questionIndex}`);
    const imgSrc = isCorrect
        ? 'Images/True.avif'
        : 'Images/False.avif';
    resultDiv.innerHTML = `<img src="${imgSrc}" alt="${isCorrect ? 'Correct' : 'Wrong'}">`;

    const buttons = document.querySelectorAll(`#questionsContainer .question:nth-child(${questionIndex + 1}) .option-btn`);
    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === (question.answer ? 'صح' : 'غلط')) {
            btn.classList.add('correct');
        } else {
            btn.classList.add('wrong');
        }
    });
}

function submitExam() {
    if (userAnswers.some(answer => answer === null)) {
        showCustomConfirm('لم تُجب على جميع الأسئلة. هل تريد تسليم الامتحان على أي حال؟', () => {
            saveExam();
            switchMode('history');
        });
        return;
    }
    saveExam();
    switchMode('history');
}

function saveExam() {
    const correctCount = userAnswers.filter(answer => answer && answer.isCorrect).length;
    const totalQuestions = questions.length;
    const examDate = new Date().toLocaleString('ar-EG');
    const examRecord = {
        id: examHistory.length + 1,
        questions: questions,
        userAnswers: userAnswers,
        score: `${correctCount}/${totalQuestions}`,
        date: examDate
    };
    examHistory.push(examRecord);
    localStorage.setItem('examHistory', JSON.stringify(examHistory));
}

function displayHistory() {
    document.getElementById('chapterTitle').innerText = 'سجل الامتحانات';
    document.getElementById('prevChapterBtn').disabled = true;
    document.getElementById('nextChapterBtn').disabled = true;
    document.getElementById('chapterHeader').style.display = 'flex';

    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    if (examHistory.length === 0) {
        container.innerText = 'لا توجد امتحانات مسجلة بعد.';
        return;
    }

    examHistory.forEach((exam, index) => {
        const examDiv = document.createElement('div');
        examDiv.className = 'history-btn';
        examDiv.innerHTML = `
            <button class="delete-btn" onclick="deleteExam(${index}, event)">
                <img src="Images/Trash.jpg" alt="Delete">
            </button>
            الامتحان ${exam.id} - النتيجة: ${exam.score}
            <div class="history-details">التاريخ: ${exam.date}</div>
        `;
        examDiv.onclick = (e) => {
            if (!e.target.closest('.delete-btn')) displayExamDetails(exam);
        };
        container.appendChild(examDiv);
    });

    animateQuestions();
}

function displayExamDetails(exam) {
    document.getElementById('chapterTitle').innerText = `تفاصيل الامتحان ${exam.id}`;
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    exam.questions.forEach((question, index) => {
        const userAnswer = exam.userAnswers[index];
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        if (userAnswer) {
            const imgSrc = userAnswer.isCorrect
                ? 'Images/True.avif'
                : 'Images/False.avif';
            questionDiv.innerHTML = `
                <div class="result"><img src="${imgSrc}" alt="${userAnswer.isCorrect ? 'Correct' : 'Wrong'}"></div>
                <div class="question-text">${index + 1}. ${question.text}</div>
                <div class="answer-text">
                    إجابتك: <span class="${userAnswer.isCorrect ? 'correct-answer' : 'wrong-answer'}">${userAnswer.userAnswer ? 'صح' : 'غلط'}</span> | 
                    الإجابة الصحيحة: <span class="correct-answer">${question.answer ? 'صح' : 'غلط'}</span>
                </div>
            `;
        } else {
            questionDiv.innerHTML = `
                <div class="result"></div>
                <div class="question-text">${index + 1}. ${question.text}</div>
                <div class="answer-text">
                    لم تُجب على هذا السؤال | 
                    الإجابة الصحيحة: <span class="correct-answer">${question.answer ? 'صح' : 'غلط'}</span>
                </div>
            `;
        }
        container.appendChild(questionDiv);
    });

    animateQuestions();
}

function deleteExam(examIndex, event) {
    event.stopPropagation();
    showCustomConfirm('هل أنت متأكد من حذف هذا الامتحان؟', () => {
        examHistory.splice(examIndex, 1);
        reindexExamHistory();
        localStorage.setItem('examHistory', JSON.stringify(examHistory));
        displayHistory();
    });
}

function clearHistory() {
    examHistory = [];
    localStorage.removeItem('examHistory');
    displayHistory();
}

function reindexExamHistory() {
    examHistory.forEach((exam, index) => {
        exam.id = index + 1;
    });
}

function nextChapter() {
    if (currentChapterIndex < chapters.length - 1) {
        currentChapterIndex++;
        loadChapter();
    }
}

function prevChapter() {
    if (currentChapterIndex > 0) {
        currentChapterIndex--;
        loadChapter();
    }
}

function switchMode(newMode) {
    mode = newMode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(newMode === 'chapters' ? 'عرض الفصول' : newMode === 'exam' ? 'وضع الامتحان' : newMode === 'history' ? 'سجل الامتحانات' : 'مسح السجل')) {
            btn.classList.add('active');
        }
    });
    if (mode === 'chapters') {
        currentChapterIndex = 0;
        loadChapter();
    } else if (mode === 'exam') {
        loadExam();
    } else {
        displayHistory();
    }
}

function animateQuestions() {
    document.querySelectorAll('.question, .history-btn').forEach((q, i) => {
        q.style.animation = `fadeIn 0.5s ease-in ${i * 0.1}s forwards`;
        q.style.opacity = '0';
    });
}

function showCustomConfirm(message, callback) {
    const modal = document.getElementById('customModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.innerText = message;
    modal.style.display = 'flex';
    modalCallback = callback;
}

function handleModalConfirm(confirmed) {
    const modal = document.getElementById('customModal');
    modal.style.display = 'none';
    if (confirmed && modalCallback) {
        modalCallback();
    }
    modalCallback = null;
}

function showCustomPrompt() {
    const modal = document.getElementById('customPromptModal');
    modal.style.display = 'flex';
}

function handlePromptConfirm() {
    const modal = document.getElementById('customPromptModal');
    const select = document.getElementById('questionCountSelect');
    const count = select.value;
    modal.style.display = 'none';
    proceedWithExam(count);
}

function handlePromptCancel() {
    const modal = document.getElementById('customPromptModal');
    modal.style.display = 'none';
    switchMode('chapters');
}

document.addEventListener('keydown', (event) => {
    if (mode === 'chapters') {
        if (event.key === 'ArrowRight') {
            prevChapter();
        } else if (event.key === 'ArrowLeft') {
            nextChapter();
        }
    }
});

// منع النقر الأيمن
document.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

// منع اختصارات F12 و Ctrl + Shift + I و Ctrl + U
document.onkeydown = function(e) {
    // منع F12 (فتح أدوات المطور)
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    // منع Ctrl + Shift + I (فتح أدوات المطور)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    // منع Ctrl + U (عرض المصدر)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
    // منع Ctrl + Shift + J (افتتاح وحدة التحكم في بعض المتصفحات)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
};

window.onload = () => {
    switchMode('chapters');
};
