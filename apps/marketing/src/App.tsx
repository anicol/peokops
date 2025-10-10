import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PrivacyPage from './pages/PrivacyPage';
import ROICalculatorPage from './pages/ROICalculatorPage';
import CoachingModePage from './pages/CoachingModePage';
import GuidePage from './pages/GuidePage';
import CorporatePage from './pages/CorporatePage';
import DemoPage from './pages/DemoPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import BlogPage from './pages/BlogPage';
import BlogCoachingOverCompliance from './pages/BlogCoachingOverCompliance';
import BlogDailyWalkthrough from './pages/BlogDailyWalkthrough';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/roi-calculator" element={<ROICalculatorPage />} />
        <Route path="/coaching-mode" element={<CoachingModePage />} />
        <Route path="/coaching" element={<CoachingModePage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/enterprise" element={<CorporatePage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/roi" element={<ROICalculatorPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/coaching-over-compliance" element={<BlogCoachingOverCompliance />} />
        <Route path="/blog/daily-walkthrough" element={<BlogDailyWalkthrough />} />
        {/* Placeholder routes for future pages */}
        <Route path="/terms" element={<div>Terms page coming soon</div>} />
      </Routes>
    </>
  );
}

export default App;