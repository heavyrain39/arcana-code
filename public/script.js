// public/script.js (v1.1 - 슬라이드업 제거, 타이핑 속도 증가)

// --- DOM 요소 가져오기 ---
const systemPromptTextarea = document.getElementById('system-prompt');
const userQuestionTextarea = document.getElementById('user-question');
const resetPromptBtn = document.getElementById('reset-prompt-btn');
const getReadingBtn = document.getElementById('get-reading-btn');
const resetAllBtn = document.getElementById('reset-all-btn');
const resultSection = document.getElementById('result-section');
const placeholderSection = document.getElementById('placeholder-section');
const loadingSpinnerDiv = document.getElementById('loading-spinner');
const cardDisplayDiv = document.getElementById('card-display');
const interpretationDiv = document.getElementById('interpretation');

// --- 전체 타로 카드 데이터 ---
const majorArcana = [
    "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
    "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
    "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
    "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World"
];
const minorArcanaSuit = ["Cups", "Pentacles", "Swords", "Wands"];
const minorArcanaRank = [
    "Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Page", "Knight", "Queen", "King"
];
let allCards = [...majorArcana];
minorArcanaSuit.forEach(suit => {
    minorArcanaRank.forEach(rank => {
        allCards.push(`${rank} of ${suit}`);
    });
});

// --- 기본 시스템 프롬프트 저장 ---
const defaultSystemPrompt = systemPromptTextarea.value;

// --- 함수 정의 ---

/** 카드 뽑기 함수 */
function drawThreeCards() {
    const drawnCards = [];
    const availableCards = [...allCards];
    if (availableCards.length < 3) {
        console.error("Critical Error: Not enough cards in the initial deck!");
        return [];
    }
    while (drawnCards.length < 3) {
        const randomIndex = Math.floor(Math.random() * availableCards.length);
        const cardName = availableCards.splice(randomIndex, 1)[0];
        const orientation = Math.random() < 0.5 ? "정방향" : "역방향";
        drawnCards.push({ name: cardName, orientation: orientation });
    }
    return drawnCards;
}

/** 로딩 스피너 표시/숨김 함수 */
function showLoadingSpinner(isLoading) {
    loadingSpinnerDiv.style.display = isLoading ? 'block' : 'none';
    if (isLoading) {
        interpretationDiv.innerHTML = '';
        resultSection.style.display = 'flex';
        placeholderSection.style.display = 'none';
    }
}

/**
 * 지정된 요소에 텍스트를 타이핑 효과로 표시하고 완료되면 Promise를 반환합니다.
 * @param {HTMLElement} element - 텍스트를 표시할 대상 span 요소
 * @param {string} text - 표시할 전체 텍스트
 * @param {number} [speed=30] - 각 글자 사이의 지연 시간 (밀리초) - ★★★ 속도 증가 (기존 50)
 * @returns {Promise<void>} 타이핑 완료 시 resolve되는 Promise
 */
function typeOneCard(element, text, speed = 30) { // ★★★ 기본 속도 30ms로 변경
    return new Promise(resolve => {
        let charIndex = 0;
        element.textContent = '';
        element.style.opacity = 1;

        const intervalId = setInterval(() => {
            if (charIndex < text.length) {
                element.textContent += text.charAt(charIndex);
                charIndex++;
            } else {
                clearInterval(intervalId);
                resolve();
            }
        }, speed); // ★★★ 변경된 속도 적용
    });
}

/** 카드 이름 표시 함수 (타이핑 애니메이션 버전 - 속도 증가) */
async function typeCardNames(cards) {
    cardDisplayDiv.innerHTML = '';
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('card-item');

        const positionText = i === 0 ? "과거" : (i === 1 ? "현재" : "미래");
        itemDiv.innerHTML = `<span class="position">${positionText}:</span> <span class="card-name"></span>`;
        cardDisplayDiv.appendChild(itemDiv);

        const cardNameSpan = itemDiv.querySelector('.card-name');
        const cardNameText = `${card.name} (${card.orientation})`;

        // CSS transition을 위해 visible 클래스 추가 (이제 transform 없이 opacity만)
        // 약간의 딜레이는 유지하여 순차적 느낌 부여
        await new Promise(resolve => setTimeout(resolve, 50));
        itemDiv.classList.add('visible');

        if (cardNameSpan) {
            // ★★★ typeOneCard 호출 시 속도 인자 전달 (기본값 30 사용) ★★★
            await typeOneCard(cardNameSpan, cardNameText); // speed 인자 생략 시 기본값(30ms) 사용
        }
         // ★★★ 각 카드 타이핑 사이 대기 시간 단축 (기존 150) ★★★
        if (i < cards.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 75)); // 75ms 대기
        }
    }
}

/** 마크다운 처리 함수 */
function parseMarkdown(text) {
    let parsedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsedText = parsedText.replace(/^\*\*🔮?\s*(과거|현재|미래).*?\*\*/gm, (match) => `<h3>${match.replace(/\*\*/g, '')}</h3>`);
    const lines = parsedText.split('\n');
    const paragraphs = [];
    let currentParagraph = '';
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('<h3')) {
            if (currentParagraph) paragraphs.push(`<p>${currentParagraph}</p>`);
            paragraphs.push(trimmedLine);
            currentParagraph = '';
        } else if (trimmedLine) {
            currentParagraph += (currentParagraph ? ' ' : '') + trimmedLine;
        } else if (currentParagraph) {
            paragraphs.push(`<p>${currentParagraph}</p>`);
            currentParagraph = '';
        }
    });
    if (currentParagraph) paragraphs.push(`<p>${currentParagraph}</p>`);
    return paragraphs.join('');
}

/** 해석 결과 표시 함수 */
function displayInterpretation(interpretation) {
    const parsedInterpretation = parseMarkdown(interpretation);
    interpretationDiv.innerHTML = parsedInterpretation;
    resultSection.style.display = 'flex';
    placeholderSection.style.display = 'none';
}

/** 오류 메시지 표시 함수 */
function displayError(message) {
    console.error(`Error Displayed: ${message}`);
    interpretationDiv.innerHTML = `
        <div class="error-message">
            <span class="error-title">오류 발생:</span>
            ${message}
        </div>`;
    resultSection.style.display = 'flex';
    placeholderSection.style.display = 'none';
}


// --- 이벤트 리스너 설정 ---

/** "결과 보기" 버튼 클릭 시 */
getReadingBtn.addEventListener('click', async () => {
    const systemPrompt = systemPromptTextarea.value;
    const userQuestion = userQuestionTextarea.value.trim();

    if (!userQuestion) {
        alert("질문을 입력해주세요.");
        userQuestionTextarea.focus();
        return;
    }

    getReadingBtn.disabled = true;
    resetAllBtn.disabled = true;
    cardDisplayDiv.innerHTML = '';
    interpretationDiv.innerHTML = '';
    loadingSpinnerDiv.style.display = 'none';
    resultSection.style.display = 'flex';
    placeholderSection.style.display = 'none';
    console.log("UI Initialized for new reading.");

    try {
        const drawnCards = drawThreeCards();
        console.log("Cards drawn:", drawnCards);
        if (drawnCards.length < 3) {
            throw new Error("카드 데이터 로드 중 문제가 발생했습니다. 관리자에게 문의하세요.");
        }
        console.log("Proceeding with 3 cards.");

        console.log("Starting card typing animation...");
        await typeCardNames(drawnCards); // 수정된 함수 호출 (빨라짐)
        console.log("Card typing animation finished.");

        showLoadingSpinner(true);
        console.log("Spinner shown. Sending fetch request...");

        const requestData = { systemPrompt, question: userQuestion, cards: drawnCards };
        const response = await fetch('/get-tarot-reading', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(requestData),
        });
        console.log("Fetch response received. Status:", response.status, "Ok:", response.ok);

        if (!response.ok) {
            let errorJson = {};
            try { errorJson = await response.json(); } catch (e) { /* ignore */ }
            const errorMessageFromServer = errorJson.message || response.statusText || `서버 응답 오류 (${response.status})`;
            throw new Error(errorMessageFromServer);
        }

        const result = await response.json();
        console.log("Response OK. Parsing interpretation.");
        displayInterpretation(result.interpretation);

    } catch (error) {
        console.error("Error during processing:", error);
        displayError(error.message);

    } finally {
        showLoadingSpinner(false);
        getReadingBtn.disabled = false;
        resetAllBtn.disabled = false;
        console.log("Processing finished. UI updated.");
    }
});

/** "기본값 복원" 버튼 클릭 시 */
resetPromptBtn.addEventListener('click', () => {
    systemPromptTextarea.value = defaultSystemPrompt;
});

/** "초기화" 버튼 클릭 시 */
resetAllBtn.addEventListener('click', () => {
    userQuestionTextarea.value = '';
    systemPromptTextarea.value = defaultSystemPrompt;
    resultSection.style.display = 'none';
    placeholderSection.style.display = 'block';
    cardDisplayDiv.innerHTML = '';
    interpretationDiv.innerHTML = '';
    loadingSpinnerDiv.style.display = 'none';
    getReadingBtn.disabled = false;
    resetAllBtn.disabled = false;
});

// --- 초기화 ---
// (변경 없음)