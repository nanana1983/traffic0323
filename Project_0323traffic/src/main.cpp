// Arduino 라이브러리 포함 (기본 입출력 및 기타 함수 제공)
#include <Arduino.h>
// TaskScheduler 라이브러리 포함 (추후 태스크를 스케줄링할 때 사용)
#include <TaskScheduler.h>
// PinChangeInterrupt 라이브러리 포함 (핀 체인지 인터럽트를 사용하기 위함)
#include <PinChangeInterrupt.h>

// 스케줄러 객체 생성 (추후 여러 작업(task)을 동시에 실행할 필요가 있을 때 사용)
Scheduler runner;

// LED 핀 번호 설정
const int LED_R = 9;      // 빨간 LED가 연결된 핀 번호
const int LED_Y = 10;     // 노란 LED가 연결된 핀 번호
const int LED_G = 11;     // 초록 LED가 연결된 핀 번호
const int POT_PIN = A0;   // 아날로그 입력 핀 A0 (예: 가변저항, 밝기 센서 등 연결)

// 버튼 핀 번호 설정 (각 버튼은 내부 풀업(PULLUP) 저항 사용)
const int BUTTON_EMERGENCY = 2; // 비상(EMERGENCY) 모드 버튼 핀
const int BUTTON_BLINKING = 3;  // 깜빡임(BLINKING) 모드 버튼 핀
const int BUTTON_ONOFF = 4;     // 전원 ON/OFF 버튼 핀

// 함수 프로토타입 선언 (함수 정의가 loop() 아래에 있을 경우 미리 알려주기 위함)
void emergencyMode();    // 비상 모드로 전환하는 인터럽트 함수
void blinkingMode();     // 깜빡임 모드로 전환하는 인터럽트 함수
void onOffMode();        // 전원 ON/OFF 모드를 토글하는 인터럽트 함수
void serialEvent();      // 시리얼 통신으로 들어온 데이터를 처리하는 함수
void trafficLightCycle(); // 신호등(traffic light) 사이클을 실행하는 함수

// 모드 및 상태 변수 선언

// volatile 키워드는 인터럽트 서비스 루틴(ISR) 내에서 변경될 수 있음을 알림
volatile bool emergency = false; // 비상 모드 여부 (true: 비상, false: 아니면)
volatile bool blinking = false;  // 깜빡임 모드 여부 (true: 깜빡임, false: 아니면)
volatile bool onOff = true;      // 전원 ON 상태 여부 (true: ON, false: OFF)
volatile bool wasOff = false;    // 이전에 전원이 OFF였는지 여부 (LED 제어 복원 시 사용)

// 아날로그 센서 값 및 LED 지속시간 변수 선언
int brightness = 0;    // 밝기 값을 저장 (POT 값을 통해 읽음)
int timeR = 2000;      // 빨간 LED 점등 지속 시간 (밀리초)
int timeY = 500;       // 노란 LED 점등 지속 시간 (밀리초)
int timeG = 2000;      // 초록 LED 점등 지속 시간 (밀리초)
String mode = "NORMAL"; // 현재 모드를 나타내는 문자열 ("NORMAL", "EMERGENCY", "BLINKING", "OFF")

// setup() 함수: Arduino가 시작할 때 한 번 실행됨
void setup() {
  // 시리얼 통신 시작 (보드레이트 9600)
  Serial.begin(9600);

  // LED 핀들을 출력으로 설정
  pinMode(LED_R, OUTPUT);
  pinMode(LED_Y, OUTPUT);
  pinMode(LED_G, OUTPUT);
  // POT 핀은 입력으로 설정 (밝기 센서 또는 가변저항)
  pinMode(POT_PIN, INPUT);

  // 버튼 핀을 내부 풀업(PULLUP) 모드로 설정 (버튼 누를 때 LOW 신호 발생)
  pinMode(BUTTON_EMERGENCY, INPUT_PULLUP);
  pinMode(BUTTON_BLINKING, INPUT_PULLUP);
  pinMode(BUTTON_ONOFF, INPUT_PULLUP);

  // 각 버튼에 대해 핀체인지 인터럽트를 설정하여 버튼이 FALLING(누름) 신호 시 호출됨
  attachPCINT(digitalPinToPCINT(BUTTON_EMERGENCY), emergencyMode, FALLING);
  attachPCINT(digitalPinToPCINT(BUTTON_BLINKING), blinkingMode, FALLING);
  attachPCINT(digitalPinToPCINT(BUTTON_ONOFF), onOffMode, FALLING);
}

// loop() 함수: Arduino의 메인 루프, 계속해서 반복 실행됨
void loop() {
  // 시리얼 통신으로 들어온 데이터를 처리하는 함수 호출
  serialEvent();
  
  // 스케줄러가 등록된 태스크가 있다면 실행 (현재는 별도의 태스크는 없으나, 확장 가능)
  runner.execute();

  // 아날로그 입력(POT)을 읽어 밝기를 업데이트하고 시리얼로 전송
  brightness = analogRead(POT_PIN);
  Serial.print("B:");
  Serial.println(brightness);

  // 현재 모드 정보를 시리얼로 전송 ("M:" 뒤에 모드 문자열)
  Serial.print("M:");
  Serial.println(mode);

  // 전원(onOff) 상태에 따라 동작을 결정
  if (onOff) {
    // 만약 이전에 전원이 OFF였던 경우, OFF 상태에서 다시 ON 상태로 돌아오면 LED를 모두 끔
    if (wasOff) {
      wasOff = false;
      digitalWrite(LED_R, LOW);
      digitalWrite(LED_Y, LOW);
      digitalWrite(LED_G, LOW);
    }

    // 모드에 따른 LED 제어
    if (mode == "EMERGENCY") {
      // 비상 모드: 빨간 LED는 켜고, 노란 및 초록은 꺼짐
      digitalWrite(LED_R, HIGH);
      digitalWrite(LED_Y, LOW);
      digitalWrite(LED_G, LOW);
      // 시리얼 메시지로 LED on/off 상태 전송 ("R1": 빨간 LED 켜짐, "Y0", "G0": 해당 LED 끔)
      Serial.println("R1");
      Serial.println("Y0");
      Serial.println("G0");
    } else if (mode == "BLINKING") {
      // 깜빡임 모드: 모든 LED를 현재 상태의 반대로 토글함
      digitalWrite(LED_R, !digitalRead(LED_R));
      digitalWrite(LED_Y, !digitalRead(LED_Y));
      digitalWrite(LED_G, !digitalRead(LED_G));
      // 현재 LED 상태에 따라 시리얼 메시지 전송 ("R1" 또는 "R0", 등)
      Serial.println(digitalRead(LED_R) ? "R1" : "R0");
      Serial.println(digitalRead(LED_Y) ? "Y1" : "Y0");
      Serial.println(digitalRead(LED_G) ? "G1" : "G0");
      // 깜빡임 모드에서는 500ms 지연
      delay(500);
    } else {
      // NORMAL 모드: 기본 신호등 사이클 실행 (trafficLightCycle() 함수 호출)
      // p5.js에서 슬라이더 조절로 전달된 LED 지속시간(timeR, timeY, timeG)이 반영됨
      trafficLightCycle();
    }
  } else {
    // 전원이 OFF 상태인 경우: 모든 LED를 끄고 off 상태 메시지를 전송
    digitalWrite(LED_R, LOW);
    digitalWrite(LED_Y, LOW);
    digitalWrite(LED_G, LOW);
    Serial.println("R0");
    Serial.println("Y0");
    Serial.println("G0");
    wasOff = true; // OFF 상태임을 기록
  }

  // loop() 사이클 간 약간의 지연 (500ms)
  delay(500);
}

// trafficLightCycle() 함수: NORMAL 모드에서 신호등 사이클을 실행하는 함수
void trafficLightCycle() {
  // 빨간불 단계
  // 빨간 LED에 밝기 값을 적용하여 켜고, 시리얼로 "R1" 메시지 전송
  analogWrite(LED_R, brightness);
  Serial.println("R1");
  // 빨간 LED 점등 지속 시간 만큼 지연
  delay(timeR);
  // 빨간 LED 끄고, "R0" 메시지 전송
  analogWrite(LED_R, 0);
  Serial.println("R0");

  // 노란불 단계
  analogWrite(LED_Y, brightness);
  Serial.println("Y1");
  delay(timeY);
  analogWrite(LED_Y, 0);
  Serial.println("Y0");

  // 초록불 단계
  analogWrite(LED_G, brightness);
  Serial.println("G1");
  delay(timeG);

  // 초록 LED 깜빡임 단계: 3회 반복하여 깜빡임 효과 적용
  for (int i = 0; i < 3; i++) {
    analogWrite(LED_G, 0);
    Serial.println("G0");
    delay(166);
    analogWrite(LED_G, brightness);
    Serial.println("G1");
    delay(166);
  }
  // 깜빡임 후 초록 LED 끔
  analogWrite(LED_G, 0);
  Serial.println("G0");

  // 노란불 재점등 단계 (반복)
  analogWrite(LED_Y, brightness);
  Serial.println("Y1");
  delay(timeY);
  analogWrite(LED_Y, 0);
  Serial.println("Y0");
}

// emergencyMode() 함수: 버튼 인터럽트를 통해 비상 모드를 토글
void emergencyMode() {
  // emergency 플래그를 반전시킴
  emergency = !emergency;
  if (emergency) {
    // 비상 모드 활성화 시, 모드를 "EMERGENCY"로 설정하고 깜빡임은 해제
    mode = "EMERGENCY";
    blinking = false;
  } else {
    // 비상 모드 해제 시, 모드를 "NORMAL"로 복원
    mode = "NORMAL";
  }
}

// blinkingMode() 함수: 버튼 인터럽트를 통해 깜빡임 모드를 토글
void blinkingMode() {
  // blinking 플래그를 반전시킴
  blinking = !blinking;
  if (blinking) {
    // 깜빡임 모드 활성화 시, 모드를 "BLINKING"으로 설정하고 비상 모드는 해제
    mode = "BLINKING";
    emergency = false;
  } else {
    // 깜빡임 모드 해제 시, 모드를 "NORMAL"로 복원
    mode = "NORMAL";
  }
}

// onOffMode() 함수: 버튼 인터럽트를 통해 전원 ON/OFF 모드를 토글
void onOffMode() {
  // onOff 플래그를 반전시킴
  onOff = !onOff;
  if (!onOff) {
    // 전원 OFF 상태이면, 모드를 "OFF"로 설정
    mode = "OFF";
  } else {
    // 전원 ON 상태 복원 시, 비상 및 깜빡임 모드 해제하고 모드를 "NORMAL"로 설정
    emergency = false;
    blinking = false;
    mode = "NORMAL";
  }
}

// serialEvent() 함수: 시리얼 포트로 들어오는 데이터를 처리하는 함수
void serialEvent() {
  // 시리얼 버퍼에 데이터가 있으면 반복 처리
  while (Serial.available()) {
    // '\n' (줄바꿈 문자)까지의 문자열을 읽어옴
    String data = Serial.readStringUntil('\n');
    // 문자열 앞뒤의 공백 제거
    data.trim();

    // 데이터가 "B:"로 시작하면, POT(밝기) 값 업데이트
    if (data.startsWith("B:")) {
      brightness = data.substring(2).toInt();
    }
    // "R:"로 시작하면, 빨간 LED 지속시간 업데이트
    else if (data.startsWith("R:")) {
      timeR = data.substring(2).toInt();
    }
    // "Y:"로 시작하면, 노란 LED 지속시간 업데이트
    else if (data.startsWith("Y:")) {
      timeY = data.substring(2).toInt();
    }
    // "G:"로 시작하면, 초록 LED 지속시간 업데이트
    else if (data.startsWith("G:")) {
      timeG = data.substring(2).toInt();
    }
    // "MODE:"로 시작하면, 모드 전환 명령을 처리
    else if (data.startsWith("MODE:")) {
      // "MODE:" 이후의 문자열을 읽어 incomingMode 변수에 저장
      String incomingMode = data.substring(5);
      // 허용하는 모드("NORMAL", "EMERGENCY", "BLINKING", "OFF")인 경우에만 처리
      if (incomingMode == "NORMAL" || incomingMode == "EMERGENCY" || incomingMode == "BLINKING" || incomingMode == "OFF") {
        mode = incomingMode;
        // 각 모드에 따라 관련 플래그를 업데이트 (비상, 깜빡임, 전원 상태)
        emergency = (mode == "EMERGENCY");
        blinking = (mode == "BLINKING");
        onOff = (mode != "OFF");
      }
    }
  }
}
