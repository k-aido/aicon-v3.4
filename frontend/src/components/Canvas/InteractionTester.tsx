import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  description: string;
}

export const InteractionTester: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Single Click Selection', status: 'pending', description: 'Click on content pieces to select them' },
    { name: 'Multi-Select (Ctrl+Click)', status: 'pending', description: 'Hold Ctrl/Cmd and click multiple elements' },
    { name: 'Double-Click Details', status: 'pending', description: 'Double-click content to open details panel' },
    { name: 'Right-Click Context Menu', status: 'pending', description: 'Right-click elements for context menu' },
    { name: 'Delete via Context Menu', status: 'pending', description: 'Delete elements using right-click menu' },
    { name: 'Keyboard Delete', status: 'pending', description: 'Select element and press Delete key' },
    { name: 'Copy/Paste (Ctrl+C/V)', status: 'pending', description: 'Copy and paste elements with keyboard' },
    { name: 'Select All (Ctrl+A)', status: 'pending', description: 'Select all elements with Ctrl+A' },
    { name: 'Connection Lines', status: 'pending', description: 'Verify dashed lines between connected elements' },
    { name: 'Panel Toggles', status: 'pending', description: 'Open/close sidebars and details panel' },
    { name: 'Canvas Panning', status: 'pending', description: 'Drag background to pan canvas' },
    { name: 'Zoom Controls', status: 'pending', description: 'Use +/- buttons to zoom in/out' }
  ]);

  const updateTest = (testName: string, status: 'pass' | 'fail') => {
    setTests(prev => prev.map(test => 
      test.name === testName ? { ...test, status } : test
    ));
  };

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const failedTests = tests.filter(t => t.status === 'fail').length;
  const totalTests = tests.length;

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm"
      >
        🧪 Test Interactions
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80 max-h-96 overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Interaction Tests</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-3 text-sm text-gray-600">
        Progress: {passedTests}/{totalTests} passed
        {failedTests > 0 && <span className="text-red-600 ml-2">({failedTests} failed)</span>}
      </div>

      <div className="space-y-2 text-sm">
        {tests.map((test, index) => (
          <div key={index} className="flex items-start gap-2 p-2 rounded bg-gray-50">
            <div className="mt-0.5">
              {test.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-500" />}
              {test.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
              {test.status === 'pending' && <AlertCircle className="w-4 h-4 text-gray-400" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-800">{test.name}</div>
              <div className="text-gray-600 text-xs">{test.description}</div>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => updateTest(test.name, 'pass')}
                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                >
                  ✓ Pass
                </button>
                <button
                  onClick={() => updateTest(test.name, 'fail')}
                  className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                >
                  ✗ Fail
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <strong>Instructions:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Test each interaction manually</li>
            <li>• Mark as Pass/Fail based on behavior</li>
            <li>• Check console for any errors</li>
          </ul>
        </div>
      </div>
    </div>
  );
};