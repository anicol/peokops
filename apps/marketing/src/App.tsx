import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
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
import BlogPivotChroniclesExtenure from './pages/BlogPivotChroniclesExtenure';
import BlogPivotChroniclesEngagement from './pages/BlogPivotChroniclesEngagement';
import BlogPivotChroniclesPeakOps from './pages/BlogPivotChroniclesPeakOps';
import BlogPivotChroniclesHeavyRealization from './pages/BlogPivotChroniclesHeavyRealization';
import BlogPivotChroniclesMicroChecks from './pages/BlogPivotChroniclesMicroChecks';
import BlogPivotChroniclesSmallActions from './pages/BlogPivotChroniclesSmallActions';
import BlogPivotChroniclesPattern from './pages/BlogPivotChroniclesPattern';
import BlogPivotChroniclesZeroRevenue from './pages/BlogPivotChroniclesZeroRevenue';
import BlogPivotChroniclesEngagementGap from './pages/BlogPivotChroniclesEngagementGap';
import BlogPivotChroniclesStartingOver from './pages/BlogPivotChroniclesStartingOver';
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
        <Route path="/blog/pivot-chronicles-extenure" element={<BlogPivotChroniclesExtenure />} />
        <Route path="/blog/pivot-chronicles-engagement" element={<BlogPivotChroniclesEngagement />} />
        <Route path="/blog/pivot-chronicles-peakops" element={<BlogPivotChroniclesPeakOps />} />
        <Route path="/blog/pivot-chronicles-heavy-realization" element={<BlogPivotChroniclesHeavyRealization />} />
        <Route path="/blog/pivot-chronicles-micro-checks" element={<BlogPivotChroniclesMicroChecks />} />
        <Route path="/blog/pivot-chronicles-small-actions" element={<BlogPivotChroniclesSmallActions />} />
        <Route path="/blog/pivot-chronicles-pattern" element={<BlogPivotChroniclesPattern />} />
        <Route path="/blog/pivot-chronicles-zero-revenue" element={<BlogPivotChroniclesZeroRevenue />} />
        <Route path="/blog/pivot-chronicles-engagement-gap" element={<BlogPivotChroniclesEngagementGap />} />
        <Route path="/blog/pivot-chronicles-starting-over" element={<BlogPivotChroniclesStartingOver />} />
        <Route path="/blog/coaching-over-compliance" element={<BlogCoachingOverCompliance />} />
        <Route path="/blog/daily-walkthrough" element={<BlogDailyWalkthrough />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
    </>
  );
}

export default App;