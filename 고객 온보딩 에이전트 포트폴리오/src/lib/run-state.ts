import { createHmac, timingSafeEqual } from "node:crypto";
import type { Content, Part } from "@google/genai";
import type { EnvState, CustomerId } from "./scenarios";

// 서버는 상태를 저장하지 않습니다(서버리스 배포용). 승인 대기 시점의 실행 상태를 서명해서
// 브라우저에 맡기고, 재개할 때 서명을 검증해 위·변조된 대화나 환경을 받지 않습니다.

export interface PendingApproval {
  id: string;
  name: string;
  input: unknown;
  apiId?: string;
}

export interface RunState {
  customerId: CustomerId;
  messages: Content[];
  env: EnvState;
  turn: number;
  partialResults: { id: string; part: Part }[];
  pending: PendingApproval[];
  toolOrder: string[]; // 해당 턴의 도구 호출 순서
  usage: { input: number; output: number; cacheRead: number };
  modelsUsed?: string[]; // 혼잡으로 대체 모델이 쓰였는지 기록
  activeModel?: string; // 이번 실행에서 현재 쓰는 모델
  nudges?: number; // 보고서 없이 멈췄을 때 계속하라고 요청한 횟수
  startedAt: number;
}

function secret() {
  const s = process.env.STATE_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("STATE_SECRET 환경 변수가 필요합니다.");
  return "dev-only-secret";
}

export function sign(state: RunState): { state: string; sig: string } {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return { state: payload, sig };
}

const MAX_AGE_MS = 1000 * 60 * 60; // 승인 대기는 1시간까지 유효

export function verify(payload: string, sig: string): RunState {
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new Error("실행 상태 서명이 올바르지 않습니다.");
  }
  const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as RunState;
  if (Date.now() - state.startedAt > MAX_AGE_MS) throw new Error("승인 대기 시간이 지났습니다. 새로 실행해 주세요.");
  return state;
}
