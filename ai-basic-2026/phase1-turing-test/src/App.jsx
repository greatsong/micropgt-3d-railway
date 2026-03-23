import { useEffect, useState } from 'react'
import { stripBase, withBase } from './config.js'
import TeacherApp from './components/teacher/TeacherApp.jsx'
import JoinPage from './components/student/JoinPage.jsx'
import TeamPage from './components/student/TeamPage.jsx'

function resolveRoute() {
  const pathname = stripBase(window.location.pathname)
  if (pathname.startsWith('/teacher')) return 'teacher'
  if (pathname.startsWith('/team')) return 'team'
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

  return <JoinPage navigate={navigate} />
}
