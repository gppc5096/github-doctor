// window.electronAPI 호출에 넘기는 값은 반드시 순수 객체여야 한다. Pinia 스토어의 state는
// Vue reactive() Proxy라서 ipcRenderer.invoke의 구조화 복제(structured clone)를 통과하지
// 못하고 "An object could not be cloned" 에러가 난다 (v1.0, 실사용 중 발견 — API 키와 무관,
// 메인 프로세스에 도달하기도 전에 렌더러→메인 전송 단계에서 실패함).
export function toIpcSafe(value) {
  return JSON.parse(JSON.stringify(value));
}
