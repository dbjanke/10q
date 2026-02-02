import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ConversationView from './components/ConversationView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/conversation/:id" element={<ConversationView />} />
      </Routes>
    </BrowserRouter>
  );
}
