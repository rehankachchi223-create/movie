import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import DiscoverPage from './pages/DiscoverPage';
import FavoritesPage from './pages/FavoritesPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MovieDetailPage from './pages/MovieDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import RecommendationsPage from './pages/RecommendationsPage';
import RegisterPage from './pages/RegisterPage';
import WatchlistPage from './pages/WatchlistPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/recommendations" element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/watchlist" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
