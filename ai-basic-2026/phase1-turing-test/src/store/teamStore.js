import { create } from 'zustand'

const useTeamStore = create((set) => ({
  teams: [],
  myTeam: null,   // { id, name, members, color, total_score }
  myRole: null,   // deprecated — 팀 단위 참여, 개인 역할 없음
  partnerTeamId: null,

  setTeams: (teams) => set({ teams }),
  setMyTeam: (team) => set({ myTeam: team }),
  setMyRole: (role) => set({ myRole: role }),
  setPartnerTeamId: (id) => set({ partnerTeamId: id }),
  updateTeamScore: (teamId, score) =>
    set((state) => ({
      teams: state.teams.map((t) =>
        t.id === teamId ? { ...t, total_score: score } : t
      ),
      myTeam:
        state.myTeam?.id === teamId
          ? { ...state.myTeam, total_score: score }
          : state.myTeam,
    })),
}))

export default useTeamStore
