// server.js 수정

const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
// const open = require('open'); // 필요시 주석 해제 및 설치

const app = express();
const port = 3000;

// --- API 키 로드 및 상태 관리 ---

// ★★★★★ 중요 변경점 시작 ★★★★★
// 실행 환경(개발 모드 vs 패키징된 exe)에 따라 기본 경로 설정
const basePath = process.pkg ? path.dirname(process.execPath) : __dirname;
// process.pkg가 존재하면 패키징된 상태 -> exe 파일의 디렉토리를 기준으로 삼음
// 그렇지 않으면 개발 상태 -> __dirname (스크립트 파일의 디렉토리)을 기준으로 삼음

const keyFileName = 'key.txt';
// 수정된 basePath를 사용하여 key.txt의 전체 경로 계산
const keyFilePath = path.join(basePath, keyFileName);
// ★★★★★ 중요 변경점 끝 ★★★★★


let apiKey = null; // 초기 상태 null
let isKeyMissing = false; // 키 파일 자체가 없는지 여부
let isModelInitialized = false; // 모델 초기화 성공 여부
// keyFilePath 변수는 위에서 이미 정의되었으므로 여기서는 사용만 함

try {
    // 수정된 keyFilePath 사용
    const keyFileContent = fs.readFileSync(keyFilePath, 'utf8').trim();
    if (keyFileContent) {
        apiKey = keyFileContent;
        // 로그 메시지에 사용된 경로도 수정된 경로로 표시되도록 함 (선택 사항이지만 명확성을 위해)
        console.log(`API Key loaded successfully from ${keyFilePath}.`);
    } else {
        // 오류 메시지에도 정확한 경로 표시
        throw new Error(`'${keyFilePath}' is empty.`);
    }
} catch (error) {
    console.error("-----------------------------------------------------------");
    // 오류 메시지에도 정확한 경로 표시
    console.error(`Error loading API Key from ${keyFilePath}:`);
    if (error.code === 'ENOENT') {
        console.error(`'${keyFileName}' not found at expected location: ${keyFilePath}. Please ensure it's in the same directory as the executable.`);
        isKeyMissing = true; // 파일 없음 상태 기록
    } else {
        console.error(error.message); // 파일은 있으나 비어있거나 다른 오류
    }
    console.error("You can get an API key from Google AI Studio.");
    console.error("-----------------------------------------------------------");
    // apiKey는 여전히 null
}
// --- API 키 로드 끝 ---

// Gemini 클라이언트 초기화
let model = null;
if (apiKey) { // apiKey가 성공적으로 로드된 경우에만 시도
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        isModelInitialized = true; // 초기화 성공 상태 기록
        console.log("Gemini AI Model initialized successfully.");
    } catch (initError) {
        console.error("-----------------------------------------------------------");
        console.error("Failed to initialize GoogleGenerativeAI with the provided key:");
        console.error(initError.message);
        console.error("Please check if your API key in 'key.txt' is valid.");
        console.error("-----------------------------------------------------------");
        // model은 여전히 null, isModelInitialized는 false 유지
    }
} else {
    console.log("Gemini AI Model not initialized because API Key is missing or invalid.");
}


// --- 나머지 Express 설정 및 라우트 ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/get-tarot-reading', async (req, res) => {
    // ★★★ API 키 또는 모델 준비 상태 확인 ★★★
    if (!apiKey || !isModelInitialized) {
        console.error("API call rejected: Server is not ready (API Key or Model issue).");
        // 사용자에게 보여줄 메시지 결정
        let userMessage = "서버 설정 오류: API 키 또는 AI 모델을 사용할 수 없습니다.";
        if (isKeyMissing) {
            userMessage = `API 키 파일(${keyFileName})을 찾을 수 없습니다. 프로그램을 종료하고 ${keyFileName} 파일을 생성한 후 API 키를 입력해주세요.`;
        } else if (!apiKey) {
            userMessage = `API 키가 비어있습니다. ${keyFileName} 파일을 열어 API 키를 입력해주세요.`;
        } else if (!isModelInitialized) {
            userMessage = `API 키가 유효하지 않거나 AI 모델 초기화에 실패했습니다. ${keyFileName} 파일의 API 키를 확인해주세요.`;
        }
        // ★★★ 400 상태 코드와 함께 특정 에러 메시지 반환 ★★★
        return res.status(400).json({ errorType: "CONFIGURATION_ERROR", message: userMessage });
    }

    console.log("Received request for /get-tarot-reading");

    try {
        const { systemPrompt, question, cards } = req.body;
        if (!systemPrompt || !question || !Array.isArray(cards) || cards.length !== 3) {
            console.error("Invalid request data received:", req.body);
            // 유효하지 않은 요청 데이터도 400 에러로 처리
            return res.status(400).json({ errorType: "INVALID_REQUEST", message: "잘못된 요청 데이터입니다." });
        }

        let finalPrompt = systemPrompt
            .replace('{card1}', cards[0].name)
            .replace('{orientation1}', cards[0].orientation)
            .replace('{card2}', cards[1].name)
            .replace('{orientation2}', cards[1].orientation)
            .replace('{card3}', cards[2].name)
            .replace('{orientation3}', cards[2].orientation)
            .replace('{question}', question);

        console.log("--- Calling Gemini API with prompt (first 200 chars) ---");
        console.log(finalPrompt.substring(0, 200) + "...");
        console.log("-------------------------------------------------------");

        const result = await model.generateContent(finalPrompt);
        const response = await result.response;

        if (!response || typeof response.text !== 'function') {
             console.error("Unexpected Gemini API response structure:", response);
             throw new Error("Gemini API 응답에서 텍스트를 추출할 수 없습니다.");
        }
        const interpretation = response.text();

        console.log("Gemini API response received successfully.");
        res.json({ interpretation: interpretation }); // 성공 시 해석 결과 반환

    } catch (error) {
        console.error("-----------------------------------------------------------");
        console.error("Error processing tarot reading:");
        console.error(error);
        console.error("-----------------------------------------------------------");

        let userErrorMessage = "타로 리딩 생성 중 서버 오류가 발생했습니다.";
        let errorDetails = error.message;
        let errorType = "API_ERROR"; // 기본 에러 타입

        if (error.message.includes('SAFETY')) {
             userErrorMessage = "콘텐츠 생성 중 안전 필터에 의해 차단되었습니다. 질문이나 프롬프트를 수정해보세요.";
             errorType = "SAFETY_FILTER";
        } else if (error.message.includes('API key not valid')) {
             userErrorMessage = "Gemini API 키가 유효하지 않습니다. key.txt 파일을 확인해주세요.";
             errorType = "INVALID_API_KEY"; // 좀 더 구체적인 타입
        } else if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('rate limit')) {
            userErrorMessage = "API 사용량 한도를 초과했거나 요청 빈도가 너무 높습니다. 잠시 후 다시 시도해주세요.";
            errorType = "RATE_LIMIT_EXCEEDED";
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
             userErrorMessage = "Gemini API 서버와 통신 중 네트워크 오류가 발생했습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.";
             errorType = "NETWORK_ERROR";
        }

        // 일반적인 500 서버 오류 반환
        res.status(500).json({ errorType: errorType, message: userErrorMessage, details: errorDetails });
    }
});


// 서버 시작
app.listen(port, async () => {
    const serverUrl = `http://localhost:${port}`;
    console.log(`Arcana Code 서버가 ${serverUrl} 에서 실행 중입니다.`);
    console.log("이 창을 닫거나 Ctrl+C를 누르면 서버가 종료됩니다.");

    // --- 브라우저 자동 열기 (선택 사항, open 라이브러리 필요) ---
    /*
    if (apiKey && isModelInitialized) {
        try {
            console.log('기본 브라우저에서 앱을 열고 있습니다...');
            await open(serverUrl);
        } catch (err) {
            console.error('브라우저 자동 열기 실패:', err.message);
            console.log(`수동으로 웹 브라우저에서 ${serverUrl} 주소로 접속해주세요.`);
        }
    } else {
        console.log("API 키 또는 모델 문제로 브라우저를 자동으로 열지 않습니다.");
        console.log(`문제가 해결되면 ${serverUrl} 주소로 접속하세요.`);
    }
    */
});