// ── 교실(방) 상태 저장소 ──
export const rooms = new Map(); // roomCode → { students: Map<socketId, studentInfo>, teacherId: null }

export function getRoomState(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, { students: new Map(), teacherId: null });
  }
  return rooms.get(roomCode);
}

export function isTeacher(socketId, roomCode) {
  const room = rooms.get(roomCode);
  return room && room.teacherId === socketId;
}

/**
 * 학생 화면으로 보내는 정보 — 팀원 학번·이름(memberNames)과 재접속 식별자(stableId)를 뺀다.
 * memberNames는 교사 기록용이다. 방 코드만 아는 사람이 다른 팀의 학번·이름을 받지 못하게 한다.
 */
export function publicStudent(student) {
  const { memberNames, stableId, ...rest } = student;
  return rest;
}

/** 교사에게는 전체 정보를, 나머지 방 참가자에게는 공개 정보만 보낸다 */
export function emitToRoomByRole(io, roomCode, event, buildPayload) {
  const room = getRoomState(roomCode);
  if (room.teacherId) {
    io.to(room.teacherId).emit(event, buildPayload(true));
    io.to(roomCode).except(room.teacherId).emit(event, buildPayload(false));
  } else {
    io.to(roomCode).emit(event, buildPayload(false));
  }
}

export function broadcastRoomUpdate(io, roomCode) {
  const room = getRoomState(roomCode);
  const studentList = Array.from(room.students.values());
  emitToRoomByRole(io, roomCode, 'room_update', (isTeacherView) => ({
    studentCount: studentList.length,
    students: isTeacherView ? studentList : studentList.map(publicStudent),
  }));
}
