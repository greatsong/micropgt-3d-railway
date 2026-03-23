import { create } from 'zustand'

const useChatStore = create((set) => ({
  conversations: [], // [{ turnNum, question, styledAnswer, waiting }]
  pendingQuestion: null, // { turnNum, question, deadline } — 응답자 화면용
  aiPreview: null, // { turnNum, aiAnswer, deadline } — 응답자 위장 모드
  votes: {}, // { [turnNum]: 'human' | 'ai' }
  voteSubmitted: false,
  results: null, // round:results 페이로드
  finalResults: null, // tournament:final 페이로드

  addQuestion: (turnNum, question) =>
    set((state) => {
      const filtered = state.conversations.filter((c) => c.turnNum !== turnNum)
      return {
        conversations: [
          ...filtered,
          { turnNum, question, styledAnswer: null, waiting: true },
        ].sort((a, b) => a.turnNum - b.turnNum),
      }
    }),

  addAnswer: (turnNum, styledAnswer) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.turnNum === turnNum ? { ...c, styledAnswer, waiting: false } : c
      ),
    })),

  setPendingQuestion: (q) => set({ pendingQuestion: q }),
  setAiPreview: (p) => set({ aiPreview: p }),

  setVote: (turnNum, verdict) =>
    set((state) => ({ votes: { ...state.votes, [turnNum]: verdict } })),

  setVoteSubmitted: () => set({ voteSubmitted: true }),
  setResults: (results) => set({ results }),
  setFinalResults: (results) => set({ finalResults: results }),

  resetRound: () =>
    set({
      conversations: [],
      pendingQuestion: null,
      aiPreview: null,
      votes: {},
      voteSubmitted: false,
      results: null,
    }),
}))

export default useChatStore
