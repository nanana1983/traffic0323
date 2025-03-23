// 시리얼 포트 객체: 아두이노와의 시리얼 통신을 위한 객체
let port; 
// 아두이노 연결을 위한 버튼 객체
let connectBtn; 
// 빨간색, 노란색, 초록색 LED의 지속 시간을 조절하기 위한 슬라이더 객체들
let sliderRLED, sliderYLED, sliderGLED; 
// LED 상태를 나타내기 위한 색상 변수(LED가 꺼져있을 때 'gray')
let circleColorR = 'gray';
let circleColorY = 'gray';
let circleColorG = 'gray'; 

// 현재 신호등 모드(예: NORMAL, EMERGENCY 등)를 나타내는 문자열 변수
let modestr = 'NORMAL'; 
// 아두이노로부터 받아온 밝기 값을 저장하는 변수
let brightness = 0; 
// LED 지속 시간의 초기값 (단위: 밀리초)
// 빨간 LED는 2000ms, 노란 LED는 500ms, 초록 LED는 2000ms 동안 점등
let timeR = 2000, timeY = 500, timeG = 2000; 

// 웹캠 비디오 객체 (p5.js에서 제공하는 비디오 캡쳐)
let video; 
// ml5.js의 handPose 모델 객체 (손 인식을 위한 ML 모델)
let handPose; 
// 감지된 손 데이터(키포인트 등)를 저장하는 배열
let hands = []; 
// 손 인식의 ON/OFF 상태를 나타내는 불리언 변수
let isDetecting = true; 
// 손의 각 키포인트를 연결하는 선 정보를 저장하는 배열
let connections = []; 
// 아두이노로 마지막에 전송한 모드를 저장하는 변수(중복 전송 방지용)
let currentMode = ""; 

// 슬라이드 모드 관련 변수들
let sliderMode = false;      // false: 버튼 모드, true: 슬라이드 모드 (손 제스처로 LED 지속시간 조절)
let prevTwoHands = false;    // 이전 프레임에서 두 손이 감지되었는지 여부를 저장하는 변수
const sliderDelta = 50;      // 손 제스처로 LED 지속시간을 조절할 때 증감되는 값 (ms 단위)
const timeMin = 500, timeMax = 5000; // LED 지속시간의 최소값과 최대값 (밀리초)
const threshold = 10;        // 손 제스처를 판단할 때, "맨 위"와 "맨 아래" 위치를 판별하는 오차 범위

// preload() 함수는 p5.js에서 스케치 시작 전에 리소스를 미리 로드할 때 사용
function preload() { 
  // ml5.js handPose 모델을 미리 로드함
  // maxHands: 최대 감지할 손의 개수, flipped: 영상 좌우 반전 여부, runtime: 'tfjs' 사용, modelType: 'full' 모델 사용
  handPose = ml5.handPose({
    maxHands: 2,
    flipped: false,
    runtime: 'tfjs',
    modelType: 'full'
  });
}

// setup() 함수는 스케치가 시작될 때 한 번 실행되는 초기 설정 함수
function setup() {
  // 800x700 크기의 캔버스를 생성하고, 페이지 상단 좌측에 위치시킴
  let cnv = createCanvas(800, 700);
  cnv.position(0, 0);
  background(220); // 회색 배경 설정

  // 웹캠 비디오 캡쳐를 생성하고, 해상도를 640x480으로 설정
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide(); // HTML 상에서 비디오를 숨기고, p5.js 캔버스에 직접 출력

  // handPose 모델을 사용하여 웹캠 영상에서 손 인식을 시작
  handPose.detectStart(video, gotHands);
  // 손의 키포인트 연결선 정보를 가져옴
  connections = handPose.getConnections();

  // 시리얼 포트 객체 생성 및 사용 가능한 포트 목록을 가져와 연결 시도
  port = createSerial();
  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    // 사용 가능한 첫 번째 포트를 9600 보드레이트로 열기
    port.open(usedPorts[0], 9600);
  }

  // 슬라이더 UI 생성 (빨강, 노랑, 초록 LED의 지속시간 조절용)
  sliderRLED = createSlider(500, 5000, timeR, 10);
  sliderRLED.position(100, 160);
  sliderRLED.size(100);
  // 슬라이더에서 마우스 버튼을 놓을 때 changeSlider() 함수 호출
  sliderRLED.mouseReleased(changeSlider);

  sliderYLED = createSlider(500, 5000, timeY, 10);
  sliderYLED.position(250, 160);
  sliderYLED.size(100);
  sliderYLED.mouseReleased(changeSlider);

  sliderGLED = createSlider(500, 5000, timeG, 10);
  sliderGLED.position(400, 160);
  sliderGLED.size(100);
  sliderGLED.mouseReleased(changeSlider);

  // 아두이노 연결을 위한 버튼 생성 및 위치 지정
  connectBtn = createButton("Connect to Arduino");
  connectBtn.position(550, 160);
  connectBtn.mousePressed(connectBtnClick); // 버튼 클릭 시 연결 함수 호출

  // 기본 텍스트 설정 (글자 크기, 색상 등)
  textSize(18);
  fill(0);
}

// draw() 함수는 p5.js에서 매 프레임마다 호출됨 (애니메이션, 실시간 업데이트)
function draw() {
  background(220); // 매 프레임마다 배경을 회색으로 초기화
  image(video, 80, 240, 640, 480); // 캔버스에 웹캠 영상을 출력 (위치 및 크기 지정)

  // 두 손(각각 8번 키포인트)이 감지되었는지 확인하여 슬라이드 모드 토글 여부 판단
  let twoHandsDetected = (hands.length === 2);
  // 만약 이전 프레임에는 두 손이 감지되지 않았고, 이번 프레임에 두 손이 감지되면 모드 토글
  if (!prevTwoHands && twoHandsDetected) {
    sliderMode = !sliderMode; // 슬라이드 모드 여부 반전 (토글)
    console.log("Slider mode toggled:", sliderMode);
  }
  // 현재 프레임의 두 손 감지 여부를 prevTwoHands에 저장
  prevTwoHands = twoHandsDetected;

  // 슬라이드 모드가 활성화되었을 경우
  if (sliderMode) {
    // 슬라이드 모드 텍스트 표시 (흰색, 크기 10, 중앙 정렬)
    fill(255);
    textSize(10);
    textAlign(CENTER, CENTER);
    text("SLIDE MODE", width / 2, 30);

    // 슬라이더 모드에서 손 제스처를 통해 LED 지속시간을 조절하는 부분
    // 각 손에 대해 키포인트 위치를 분석하여, 특정 키포인트가 화면 상단(최소 y값) 혹은 하단(최대 y값)일 때 시간을 증감
    for (let i = 0; i < hands.length; i++) {
      let hand = hands[i]; // 현재 손 데이터
      let keypoints = hand.keypoints; // 해당 손의 모든 키포인트 배열
      // 모든 키포인트의 y좌표 배열 생성
      let yPositions = keypoints.map(pt => pt.y);
      // 해당 손의 최소 y좌표 (상단)
      let minY = Math.min(...yPositions);
      // 해당 손의 최대 y좌표 (하단)
      let maxY = Math.max(...yPositions);

      // 4번 키포인트 (엄지 끝) 위치에 따라 빨간 LED 지속시간(timeR) 조절
      let kp4 = keypoints[4];
      if (abs(kp4.y - minY) < threshold) {
        // 엄지가 상단에 가까우면 timeR 증가
        timeR = constrain(timeR + sliderDelta, timeMin, timeMax);
      } else if (abs(kp4.y - maxY) < threshold) {
        // 엄지가 하단에 가까우면 timeR 감소
        timeR = constrain(timeR - sliderDelta, timeMin, timeMax);
      }

      // 8번 키포인트 (검지 끝) 위치에 따라 노란 LED 지속시간(timeY) 조절
      let kp8 = keypoints[8];
      if (abs(kp8.y - minY) < threshold) {
        timeY = constrain(timeY + sliderDelta, timeMin, timeMax);
      } else if (abs(kp8.y - maxY) < threshold) {
        timeY = constrain(timeY - sliderDelta, timeMin, timeMax);
      }

      // 20번 키포인트 (새끼손가락 끝) 위치에 따라 초록 LED 지속시간(timeG) 조절
      let kp20 = keypoints[20];
      if (abs(kp20.y - minY) < threshold) {
        timeG = constrain(timeG + sliderDelta, timeMin, timeMax);
      } else if (abs(kp20.y - maxY) < threshold) {
        timeG = constrain(timeG - sliderDelta, timeMin, timeMax);
      }
    }
    // 슬라이더 UI의 값 업데이트: 손 제스처로 조절된 시간 값을 슬라이더에 반영
    sliderRLED.value(timeR);
    sliderYLED.value(timeY);
    sliderGLED.value(timeG);
    // 슬라이더 텍스트 스타일을 흰색으로 변경 (슬라이드 모드에서는 흰색 텍스트)
    sliderRLED.style('color', 'white');
    sliderYLED.style('color', 'white');
    sliderGLED.style('color', 'white');

    // 슬라이드 모드일 때 조절된 LED 지속시간 값을 아두이노로 전송
    if (port.opened()) {
      port.write("R:" + timeR + "\n");
      port.write("Y:" + timeY + "\n");
      port.write("G:" + timeG + "\n");
    }
  } else { 
    // 슬라이드 모드가 아닐 때 (버튼 모드)
    // 손 제스처를 이용해 모드를 결정하는 부분
    let message = "";
    for (let i = 0; i < hands.length; i++) {
      let hand = hands[i];
      let keypoints = hand.keypoints;
      let yPositions = keypoints.map(pt => pt.y);
      let minY = Math.min(...yPositions);
      let maxY = Math.max(...yPositions);

      let kp4 = keypoints[4]; // 엄지 끝
      let kp8 = keypoints[8]; // 검지 끝

      // 엄지의 위치에 따라 NORMAL 또는 EMERGENCY 모드 선택
      if (abs(kp4.y - minY) < threshold) message = "BLINKING";
      else if (abs(kp4.y - maxY) < threshold) message = "EMERGENCY";

      // 검지의 위치에 따라 BLINKING 또는 OFF 모드 선택
      if (abs(kp8.y - minY) < threshold) message = "NORMAL";
      else if (abs(kp8.y - maxY) < threshold) message = "OFF";

      // 손의 키포인트들 사이를 연결하는 선 그리기
      for (let j = 0; j < connections.length; j++) {
        const [startIdx, endIdx] = connections[j];
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];
        stroke(255, 0, 0); // 빨간색 선
        strokeWeight(2);
        // 연결 선은 이미지 위치 보정 (x + 80, y + 240) 후 그리기
        line(start.x + 80, start.y + 240, end.x + 80, end.y + 240);
      }

      // 각 키포인트에 원을 그리고, 번호를 표시 (디버깅/시각화용)
      for (let j = 0; j < keypoints.length; j++) {
        const pt = keypoints[j];
        fill(0, 255, 0); // 녹색 원
        noStroke();
        circle(pt.x + 80, pt.y + 240, 10);
        fill(255); // 번호는 흰색
        textSize(12);
        textAlign(CENTER, CENTER);
        text(j, pt.x + 80, pt.y + 228);
      }
    }
    // 만약 메시지가 있고, 이전에 전송한 모드와 다르다면 아두이노에 새로운 모드 전송
    if (message !== "" && message !== currentMode && port.opened()) {
      port.write("MODE:" + message + "\n");
      currentMode = message;
      console.log("MODE 전송:", message);
    }

    // 버튼 모드 UI: 상단에 모드와 밝기 정보 표시
    fill("red");
    textSize(15);
    textAlign(LEFT, CENTER);
    text("MODE: " + modestr, 160, 30);
    fill("black");
    textSize(15);
    text("BRIGHTNESS: " + brightness, 160, 60);

    // 버튼 모드에서는 슬라이더 텍스트 색상을 원래 검은색으로 복원
    sliderRLED.style('color', 'black');
    sliderYLED.style('color', 'black');
    sliderGLED.style('color', 'black');
  }

  // 화면 하단에 슬라이더 값 표시 (각 LED별)
  fill(sliderMode ? 255 : 0); // 슬라이드 모드일 때는 흰색, 아니면 검은색
  textSize(10);
  textAlign(LEFT, CENTER);
  text("Red LED Time: " + timeR, 100, 140);
  text("Yellow LED Time: " + timeY, 250, 140);
  text("Green LED Time: " + timeG, 400, 140);

  // 아두이노로부터 시리얼 데이터 수신 및 처리
  let n = port.available();
  if (n > 0) {
    let str = port.readUntil("\n"); // 줄바꿈 문자까지 읽기
    fill(0);
    text("msg: " + str, 10, 200);

    // 시리얼 데이터에 포함된 각 메시지에 따라 변수 업데이트
    if (str.includes("B:")) brightness = parseInt(str.split("B:")[1]);
    if (str.includes("M:")) modestr = str.split("M:")[1].split(",")[0];

    // "R1"이면 빨간 LED on (red), "R0"이면 off (gray)
    if (str.includes("R1")) circleColorR = 'red';
    else if (str.includes("R0")) circleColorR = 'gray';

    // "Y1"이면 노란 LED on, "Y0"이면 off
    if (str.includes("Y1")) circleColorY = 'yellow';
    else if (str.includes("Y0")) circleColorY = 'gray';

    // "G1"이면 초록 LED on, "G0"이면 off
    if (str.includes("G1")) circleColorG = 'green';
    else if (str.includes("G0")) circleColorG = 'gray';
  }

  // 상단에 LED 상태를 나타내는 원들을 그리기 (실제 LED의 on/off 상태 반영)
  fill(circleColorR); circle(150, 100, 50);
  fill(circleColorY); circle(300, 100, 50);
  fill(circleColorG); circle(450, 100, 50);
}

// handPose 모델이 감지한 손 데이터를 받아오는 콜백 함수
function gotHands(results) {
  // 결과 배열을 전역 변수 hands에 저장
  hands = results;
}

// 마우스 클릭 시 손 인식 ON/OFF 전환 함수
function mousePressed() {
  toggleDetection();
}

// 손 인식 ON/OFF 상태를 토글하는 함수
function toggleDetection() {
  if (isDetecting) {
    // 감지 중이면 중지
    handPose.detectStop();
    isDetecting = false;
    console.log("손 감지 중지됨");
  } else {
    // 감지 중지가 아니라면 다시 시작
    handPose.detectStart(video, gotHands);
    isDetecting = true;
    console.log("손 감지 시작됨");
  }
}

// 아두이노 연결 버튼 클릭 시 호출되는 함수
function connectBtnClick() {
  // 포트가 열려있으면 닫고, 닫혀있으면 9600 보드레이트로 열기
  port.opened() ? port.close() : port.open(9600);
}

// 슬라이더 값이 변경되었을 때 호출되는 함수 (마우스 릴리즈 시)
function changeSlider() {
  // 슬라이더 값에 따라 아두이노에 LED 지속시간 전송
  port.write("R:" + sliderRLED.value() + "\n");
  port.write("Y:" + sliderYLED.value() + "\n");
  port.write("G:" + sliderGLED.value() + "\n");
}
