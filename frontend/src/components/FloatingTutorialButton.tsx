import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, ToggleLeft, ToggleRight, Bot } from 'lucide-react';
import { useTutorialStore } from '../store/tutorialStore';

export default function FloatingTutorialButton() {
  const [isTutorialMenuOpen, setIsTutorialMenuOpen] = useState(false);
  const { isTutorialModeEnabled, toggleTutorialMode, triggerTour } = useTutorialStore();
  const navigate = useNavigate();

  const handleStartTour = () => {
    setIsTutorialMenuOpen(false);
    triggerTour('nav');
    navigate('/dashboard');
  };

  const handleStartDashTour = () => {
    setIsTutorialMenuOpen(false);
    triggerTour('dashboard');
    navigate('/dashboard');
  };

  return (
    <div className="floating-tutorial-button fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2">
      {/* Menu Items */}
      <div
        className={`flex flex-col items-end gap-2 transition-all duration-300 origin-bottom-right ${isTutorialMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'}`}
      >
        <button
          onClick={handleStartTour}
          className="whitespace-nowrap text-xs sm:text-sm px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> PlanBe 통합 네비게이션 튜토리얼
        </button>

        <button
          onClick={handleStartDashTour}
          className="whitespace-nowrap text-xs sm:text-sm px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all flex items-center gap-2"
        >
          <Info className="w-4 h-4" /> 대시보드 가이드
        </button>

        <button
          onClick={toggleTutorialMode}
          className={`whitespace-nowrap text-xs sm:text-sm px-4 py-2.5 border rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 ${
            isTutorialModeEnabled
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {isTutorialModeEnabled ? (
            <><ToggleRight className="w-4 h-4" /> 전체 튜토리얼 (켜짐)</>
          ) : (
            <><ToggleLeft className="w-4 h-4 text-gray-400" /> 전체 튜토리얼 (꺼짐)</>
          )}
        </button>
      </div>

      {/* Main Floating Button */}
      <button
        onClick={() => setIsTutorialMenuOpen(!isTutorialMenuOpen)}
        className="bg-indigo-600 text-white px-5 py-3 rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:bg-indigo-700 transition-all flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-indigo-300 relative"
        aria-label="튜토리얼 모드 메뉴"
      >
        <Bot className="w-5 h-5" />
        <span className="font-semibold text-sm">튜토리얼 모드</span>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white"></span>
        </span>
      </button>
    </div>
  );
}
