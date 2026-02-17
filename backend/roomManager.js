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

export function broadcastRoomUpdate(io, roomCode) {
  const room = getRoomState(roomCode);
  const studentList = Array.from(room.students.values());
  io.to(roomCode).emit('room_update', {
    studentCount: studentList.length,
    students: studentList,
  });
}
