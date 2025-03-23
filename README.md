# traffic0323

유튜브 영상 링크 : https://youtu.be/nT1202hjWX0?si=EmmGtixpSZAy_dDs 

1. 시스템 개요
이 시스템은 아두이노와 p5.js를 시리얼 통신으로 연결하여 신호등 제어를 구현합니다.
주요 특징:

신호등 제어: 기본 신호등 사이클(빨간 → 노란 → 초록 → 초록 깜빡임 3회 → 노란 → 빨간) 동작

모드 전환:

비상 모드 (EMERGENCY): 빨간 LED만 켜짐

깜빡임 모드 (BLINKING): 모든 LED가 동기적으로 깜빡임

ON/OFF 모드 (ALL OFF): 버튼을 통해 신호등 전체를 끄거나 정상 모드로 복귀

LED 밝기 조절: 가변저항(POT)을 통해 LED 밝기를 조절

p5.js 웹 인터페이스:

실시간 시리얼 데이터 모니터링 및 시각화

슬라이더와 손 인식(ml5.js handPose)을 이용해 LED 점등 시간 및 모드 제어

2. 아두이노 코드 설명
주요 기능
기본 신호등 사이클

순서:
빨간불 → 노란불 → 초록불 → (초록 LED 3회 깜빡임) → 노란불 → 빨간불

trafficLightCycle() 함수에서 각 LED의 점등 시간이 timeR, timeY, timeG 변수로 제어됩니다.

비상 모드 (EMERGENCY MODE)

동작: 빨간 LED만 켜지고, 나머지 LED는 모두 꺼짐

활성화: 디지털 핀 D2에 연결된 버튼(BUTTON_EMERGENCY)을 누르면 인터럽트를 통해 모드가 "EMERGENCY"로 전환

깜빡임 모드 (BLINKING MODE)

동작: 모든 LED가 동기적으로 깜빡임

활성화: 디지털 핀 D3에 연결된 버튼(BUTTON_BLINKING)을 누르면 "BLINKING" 모드로 전환

신호등 ON/OFF 모드 (ALL OFF)

동작: 디지털 핀 D4에 연결된 버튼(BUTTON_ONOFF)을 누르면 모든 LED가 꺼지고, 다시 누르면 정상("NORMAL") 모드로 복귀

가변저항을 통한 LED 밝기 조절

연결: 아날로그 핀 A0 (POT_PIN)

기능: 0~1023 범위의 가변저항 값을 읽어 LED 밝기를 조절

p5.js와의 시리얼 통신

![슬라이더 ui](https://github.com/user-attachments/assets/78a2a151-1c15-4a65-b7a6-6b338b2a11ab)


출력: 현재 LED 밝기, 모드, 각 LED 점등 지속시간 등을 시리얼 메시지로 전송

예: "B:"(밝기), "M:"(모드), "R1"/"R0", "Y1"/"Y0", "G1"/"G0" (LED on/off 상태)

입력: p5.js에서 슬라이더 조절 및 모드 변경("R:", "Y:", "G:", "MODE:" 메시지) 명령을 수신하여 변수에 반영

아두이노 태스크 관리

Task1: LED 신호 주기적 점등 – trafficLightCycle() 함수를 통해 NORMAL 모드에서 신호등 사이클 실행

Task2: LED OFF 제어 – OFF 모드일 경우 모든 LED를 끄며, 비상 모드에서는 빨간 LED만, 깜빡임 모드에서는 모든 LED가 깜빡임

Task3: 시리얼 입력 확인 및 적용 – serialEvent() 함수에서 수신 데이터를 처리하여 밝기와 LED 지속시간 조절
![회로도실물](https://github.com/user-attachments/assets/9a637550-7f58-448c-a685-bf74d2848d1c)

![회로도](https://github.com/user-attachments/assets/685152d5-39f6-4674-a419-d68f9c0291de)


회로 구성 및 핀 배치

LED 연결 (디지털 핀 D9, D10, D11)

빨간 LED (D9): HIGH → ON, LOW → OFF

노란 LED (D10): HIGH → ON, LOW → OFF

초록 LED (D11): HIGH → ON, LOW → OFF

전류 제한 저항 사용 및 공통 GND 연결

버튼 연결 (디지털 핀 D2, D3, D4, INPUT_PULLUP)

비상 모드 버튼 (D2), 깜빡임 모드 버튼 (D3), ON/OFF 버튼 (D4)

내부 풀업 저항(약 20kΩ) 사용 – 기본 HIGH, 버튼 누르면 LOW

가변저항 연결 (아날로그 입력 A0)

중앙 핀 → A0, 한쪽 핀 → 5V, 다른쪽 핀 → GND

LED 밝기 조절에 사용

전원 연결

아두이노 5V → 브레드보드 전원 레일

아두이노 GND → 브레드보드 접지 레일

3. p5.js 코드 설명 (handPose 포함)
주요 기능
시리얼 통신

아두이노와의 시리얼 포트를 통해 LED 지속시간, 밝기, 모드 정보 등을 송수신

수신 메시지 예: "B:"(밝기), "M:"(모드), "R1"/"R0", "Y1"/"Y0", "G1"/"G0" (각 LED 상태)

웹캠 영상 & 손 인식

웹캠 캡쳐:

createCapture(VIDEO)를 사용하여 640x480 해상도의 웹캠 영상을 캔버스에 출력

handPose 모델:

preload() 함수에서 ml5.js의 handPose 모델을 로드 (maxHands: 2, flipped: false, runtime: 'tfjs', modelType: 'full')

손 제스처 기반 제어:

슬라이드 모드:

두 손이 감지되면 슬라이드 모드 토글

손의 특정 키포인트(엄지, 검지, 새끼손가락 끝)의 위치를 분석하여 빨간, 노란, 초록 LED의 지속시간(timeR, timeY, timeG)을 조절

변경된 값은 슬라이더 UI에 반영되고, 시리얼 메시지("R:", "Y:", "G:")로 아두이노에 전송

버튼 모드:

슬라이드 모드가 아닐 때 손 제스처(엄지, 검지 위치)를 통해 "NORMAL", "EMERGENCY", "BLINKING", "OFF" 모드를 결정하고 아두이노에 전송("MODE:" 메시지)

UI 구성 및 시각화

슬라이더 UI:

빨간, 노란, 초록 LED 지속시간을 조절하는 슬라이더(최소 500ms, 최대 5000ms) 생성

슬라이더 값 변경 시 changeSlider() 함수로 아두이노에 전송

아두이노 연결 버튼:

"Connect to Arduino" 버튼으로 시리얼 포트 열기/닫기 처리

화면 출력:

웹캠 영상을 캔버스에 출력하고, 감지된 손의 키포인트와 연결선을 그려 시각화

상단에 LED 상태를 원으로 표시 (예: "R1"이면 빨간색, "R0"이면 회색)

텍스트 출력:

현재 모드, 밝기, 슬라이더 값 등이 화면에 표시되어 상태를 모니터링

회로 구성 및 통신 (p5.js 역할)
시리얼 포트 연결

웹 시리얼 라이브러리를 통해 아두이노와 연결되어 데이터를 주고받음

손 인식 및 모드 전환

ml5.js의 handPose 모델을 사용하여 손의 키포인트와 제스처를 인식

손 제스처에 따라 슬라이드 모드(LED 지속시간 조절)와 버튼 모드(모드 전환)를 수행하며, 해당 데이터가 시리얼 메시지로 아두이노에 전송됨

4. 최종 요약
아두이노 역할
신호등 기본 주기 동작:

빨간, 노란, 초록 LED 순서와 초록 LED 깜빡임 효과 구현

모드 전환:

비상 모드: 버튼(D2) 입력 시 빨간 LED만 켜짐

깜빡임 모드: 버튼(D3) 입력 시 모든 LED가 동기 깜빡임

ON/OFF 모드: 버튼(D4) 입력 시 전체 신호등 OFF/복원

밝기 조절:

가변저항(POT, A0) 값을 통해 LED 밝기 제어

시리얼 통신:

p5.js와 LED 지속시간, 밝기, 모드 정보를 주고받으며 제어 명령 적용

태스크 관리:

기본 주기 점등, LED OFF 제어, 시리얼 데이터 처리 등 다양한 동작 모드 관리

p5.js 역할 (handPose 통합)
웹에서 시리얼 데이터 모니터링:

아두이노의 LED 상태, 모드, 밝기 등의 정보를 실시간으로 수신하여 화면에 표시

손 인식 기반 제어:

ml5.js handPose 모델을 통해 웹캠에서 손의 키포인트와 제스처 인식

슬라이드 모드에서는 두 손 감지 시 손 제스처를 통해 LED 지속시간 조절

버튼 모드에서는 손 제스처로 "NORMAL", "EMERGENCY", "BLINKING", "OFF" 모드 결정 및 전송

UI 및 시각화:

슬라이더, 아두이노 연결 버튼, 웹캠 영상, 손 인식 결과, LED 상태(원으로 표시) 등을 통해 사용자가 신호등 상태를 직관적으로 확인 및 제어할 수 있음
