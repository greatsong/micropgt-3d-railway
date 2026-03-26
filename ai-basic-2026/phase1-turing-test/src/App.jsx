import { useEffect, useState } from 'react'
import { stripBase, withBase } from './config.js'
import TeacherApp from './components/teacher/TeacherApp.jsx'
import JoinPage from './components/student/JoinPage.jsx'
import TeamPage from './components/student/TeamPage.jsx'
import GuidePage from './components/GuidePage.jsx'
import StudentGuidePage from './components/student/StudentGuidePage.jsx'

function resolveRoute() {
  const pathname = stripBase(window.location.pathname)
  if (pathname.startsWith('/teacher')) return 'teacher'
  if (pathname.startsWith('/team')) return 'team'
  if (pathname.startsWith('/student-guide')) return 'student-guide'
  if (pathname.startsWith('/guide')) return 'guide'
  return 'join'
}

export default function App() {
  const [route, setRoute] = useState(resolveRoute)

  useEffect(() => {
    const handlePopState = () => setRoute(resolveRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (path) => {
    const nextUrl = withBase(path)
    window.history.pushState({}, '', nextUrl)
    setRoute(resolveRoute())
  }

  if (route === 'teacher') {
    return <TeacherApp navigate={navigate} />
  }

  if (route === 'team') {
    return <TeamPage navigate={navigate} />
  }

  if (route === 'student-guide') {
    return <StudentGuidePage navigate={navigate} />
  }

  if (route === 'guide') {
    return <GuidePage navigate={navigate} />
  }

  return <JoinPage navigate={navigate} />
}
