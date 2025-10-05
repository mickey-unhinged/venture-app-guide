import { Routes, Route } from 'react-router-dom';
import Scanner from './pages/student/Scanner';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Scanner />} />
    </Routes>
  );
}

export default App;
