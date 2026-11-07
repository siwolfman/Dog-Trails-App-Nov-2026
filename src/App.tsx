import { Route, Routes } from 'react-router'
import Home from './pages/Home.tsx'
import PlacePage from './pages/Place.tsx'
import NotFound from './pages/NotFound.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/place/:slug" element={<PlacePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
