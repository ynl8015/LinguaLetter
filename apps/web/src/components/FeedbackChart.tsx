import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface OverallStats {
  averageScores: {
    grammar: number;
    vocabulary: number;
    fluency: number;
    comprehension: number;
    naturalness: number;
    overall: number;
  };
  totalSessions: number;
  commonStrengths: string[];
  commonImprovements: string[];
  overallGrade: string;
}

interface OverallFeedbackProps {
  overallStats: OverallStats | null;
}

const OverallFeedback: React.FC<OverallFeedbackProps> = ({ overallStats }) => {
  if (!overallStats) {
    return (
      <div className="bg-white rounded-[20px] p-8 shadow-lg border border-gray-200">
        <div className="text-center text-gray-500">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-lg mb-2">아직 피드백 데이터가 없습니다.</p>
          <p className="text-sm">AI 선생님과 대화를 나눠보세요!</p>
        </div>
      </div>
    );
  }

  // 레이더 차트용 데이터 준비
  const radarData = [
    {
      subject: '문법',
      score: overallStats.averageScores.grammar,
      fullMark: 10,
    },
    {
      subject: '어휘',
      score: overallStats.averageScores.vocabulary,
      fullMark: 10,
    },
    {
      subject: '유창성',
      score: overallStats.averageScores.fluency,
      fullMark: 10,
    },
    {
      subject: '이해력',
      score: overallStats.averageScores.comprehension,
      fullMark: 10,
    },
    {
      subject: '자연스러움',
      score: overallStats.averageScores.naturalness,
      fullMark: 10,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 종합 점수 */}
      <div className="bg-white rounded-[20px] p-8 shadow-lg border border-gray-200">
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">종합 평가</h3>
          <div className="text-4xl font-bold text-gray-800 mb-2">{overallStats.averageScores.overall.toFixed(1)}</div>
          <div className="text-lg font-semibold px-4 py-2 rounded-[12px] inline-block bg-sky-100 text-sky-700 border border-sky-200 mb-2">
            {overallStats.overallGrade}
          </div>
          <div className="text-sm text-gray-500">총 {overallStats.totalSessions}회 학습</div>
        </div>
        
        {/* 레이더 차트 */}
        <div className="h-80 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid 
                gridType="polygon"
                radialLines={true}
                stroke="#e5e7eb"
              />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fontSize: 12, fill: '#4b5563' }}
                className="text-sm font-medium"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 10]} 
                tick={false}
                axisLine={false}
              />
              <Radar
                name="점수"
                dataKey="score"
                stroke="#0ea5e9"
                fill="#0ea5e9"
                fillOpacity={0.1}
                strokeWidth={2}
                dot={{ r: 4, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 점수 표시 */}
        <div className="grid grid-cols-5 gap-4 text-center">
          {radarData.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-[12px] p-3">
              <span className="text-sm text-gray-600 block mb-1">{item.subject}</span>
              <span className="text-xl font-bold text-gray-800">{item.score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 잘한 점과 개선점 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 잘한 점 */}
        <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
          <h4 className="text-lg font-bold text-gray-800 mb-4">잘한 점</h4>
          <div className="space-y-3">
            {overallStats.commonStrengths.length > 0 ? (
              overallStats.commonStrengths.map((strength, index) => (
                <div key={index} className="flex items-start bg-gray-50 rounded-[12px] p-3">
                  <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-700">{strength}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">더 많은 대화를 통해 강점을 찾아보세요!</p>
              </div>
            )}
          </div>
        </div>

        {/* 개선점 */}
        <div className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200">
          <h4 className="text-lg font-bold text-gray-800 mb-4">개선점</h4>
          <div className="space-y-3">
            {overallStats.commonImprovements.length > 0 ? (
              overallStats.commonImprovements.map((improvement, index) => (
                <div key={index} className="flex items-start bg-gray-50 rounded-[12px] p-3">
                  <div className="w-6 h-6 bg-sky-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-gray-700">{improvement}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">더 많은 대화를 통해 개선점을 찾아보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverallFeedback;