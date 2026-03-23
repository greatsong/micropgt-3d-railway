import { create } from 'zustand'

const useSessionStore = create((set) => ({
  sessionId: null,
  teacherCode: null,
  status: 'waiting', // waiting | chatting | voting | voting-closed | revealed | ended
  currentRound: null, // { roundNum, style, aiModel, turns, chatTime, responseDelay, voteTime, pointValue }
  timer: null, // { phase, remaining }

  setSession: (sessionId, teacherCode) => set({ sessionId, teacherCode }),
  setStatus: (status) => set({ status }),
  setCurrentRound: (round) => set({ currentRound: round }),
  setTimer: (timer) => set({ timer }),
  resetRound: () => set({ status: 'waiting', currentRound: null, timer: null }),
}))

export default useSessionStore
