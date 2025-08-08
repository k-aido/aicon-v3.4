import React from 'react';

const AiconCanvasSimple = () => {
  console.log('AiconCanvasSimple rendering');
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="p-4 bg-white shadow">
        <h1 className="text-2xl font-bold">Canvas Test</h1>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Canvas component is loading!</p>
          <p className="text-gray-600 mt-2">If you see this, the basic component works.</p>
        </div>
      </div>
    </div>
  );
};

export default AiconCanvasSimple;