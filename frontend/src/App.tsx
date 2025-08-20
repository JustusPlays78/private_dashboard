import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Tasks from './pages/Tasks';
import Scripts from './pages/Scripts.tsx';
import Secrets from './pages/Secrets.tsx';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/secrets" element={<Secrets />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
