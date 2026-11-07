import { Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth.tsx'
import Admin from './pages/Admin.tsx'
import AuthPage from './pages/AuthPage.tsx'
import Home from './pages/Home.tsx'
import NotFound from './pages/NotFound.tsx'
import PlacePage from './pages/Place.tsx'
import Sunday from './pages/Sunday.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Home />} />
        <Route path="/place/:slug" element={<PlacePage />} />
        <Route path="/sunday" element={<Sunday />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
