import React from 'react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">서비스 이용약관</h1>
        
        <div className="space-y-8 text-gray-700">
          <section>
            <p className="mb-4">
              <strong>마지막 업데이트:</strong> 2026년 1월 29일
            </p>
            <p className="mb-4">
              본 약관은 NKLE("회사", "저희" 또는 "우리")가 제공하는 
              멀티채널 마케팅 플랫폼("서비스")의 이용 조건을 규정합니다. 
              서비스를 이용함으로써 귀하는 본 약관에 동의하는 것으로 간주됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 서비스 설명</h2>
            <p className="mb-3">
              NKLE 멀티채널 마케팅 플랫폼은 소상공인 및 마케팅 실무자를 위한 
              통합 광고 성과 관리 도구입니다.
            </p>
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">1.1 주요 기능</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>통합 대시보드:</strong> 여러 광고 플랫폼의 성과를 한눈에 확인</li>
              <li><strong>광고 플랫폼 연동:</strong>
                <ul className="list-circle pl-6 mt-2 space-y-1">
                  <li>Meta (Facebook/Instagram) Ads</li>
                  <li>Google Ads</li>
                  <li>Naver Ads</li>
                  <li>당근마켓 Ads</li>
                </ul>
              </li>
              <li><strong>성과 분석:</strong> CTR, CPC, ROAS 등 주요 지표 추적</li>
              <li><strong>AI 추천:</strong> 머신러닝 기반 예산 최적화 및 플랫폼 추천</li>
              <li><strong>예산 모니터링:</strong> 실시간 예산 사용 현황 확인</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 계정 등록 및 관리</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.1 계정 생성</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>서비스 이용을 위해 계정 생성이 필요합니다</li>
              <li>이메일/비밀번호 또는 소셜 로그인(카카오, 네이버, 구글) 사용 가능</li>
              <li>정확하고 최신의 정보를 제공해야 합니다</li>
              <li>만 14세 이상만 계정을 생성할 수 있습니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.2 계정 보안</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>비밀번호는 안전하게 보관할 책임이 있습니다</li>
              <li>계정의 무단 사용을 즉시 신고해야 합니다</li>
              <li>계정을 타인과 공유할 수 없습니다</li>
              <li>계정 활동에 대한 책임은 계정 소유자에게 있습니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.3 계정 해지</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>언제든지 계정을 삭제할 수 있습니다</li>
              <li>계정 삭제 시 모든 데이터가 30일 이내 영구 삭제됩니다</li>
              <li>광고 플랫폼 연동도 자동으로 해제됩니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 광고 플랫폼 연동</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.1 연동 절차</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>각 광고 플랫폼의 OAuth 인증을 통해 연동합니다</li>
              <li>연동 시 해당 플랫폼의 이용약관에도 동의하게 됩니다</li>
              <li>필요한 권한만 요청하며, 최소 권한 원칙을 따릅니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.2 데이터 사용</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>연동된 광고 데이터는 귀하의 계정에서만 사용됩니다</li>
              <li>데이터는 분석 및 AI 추천 제공 목적으로만 사용됩니다</li>
              <li>제3자와 데이터를 공유하지 않습니다</li>
              <li>언제든지 연동을 해제할 수 있습니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.3 Meta 플랫폼 특별 조항</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Meta의 플랫폼 정책을 준수합니다</li>
              <li>Facebook/Instagram 광고 데이터는 Meta API를 통해 수집됩니다</li>
              <li>Meta 데이터는 개인정보처리방침에 명시된 목적으로만 사용됩니다</li>
              <li>Meta 정책 변경 시 본 약관도 업데이트될 수 있습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 사용자 의무</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.1 금지 행위</h3>
            <p className="mb-3">다음의 행위는 금지됩니다:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>타인의 계정을 무단으로 사용하는 행위</li>
              <li>서비스를 불법적인 목적으로 사용하는 행위</li>
              <li>서비스의 운영을 방해하거나 보안을 침해하는 행위</li>
              <li>자동화된 도구(봇, 스크레이퍼 등)를 무단으로 사용하는 행위</li>
              <li>서비스를 역엔지니어링, 디컴파일, 디스어셈블하는 행위</li>
              <li>허위 정보를 제공하거나 사칭하는 행위</li>
              <li>다른 사용자를 괴롭히거나 스팸을 전송하는 행위</li>
              <li>지적 재산권을 침해하는 행위</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.2 콘텐츠 책임</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>귀하가 서비스에 업로드하는 콘텐츠에 대한 책임은 귀하에게 있습니다</li>
              <li>불법적이거나 타인의 권리를 침해하는 콘텐츠를 업로드할 수 없습니다</li>
              <li>연동된 광고 계정이 각 플랫폼의 정책을 준수해야 합니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 지적 재산권</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">5.1 서비스 소유권</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>서비스 및 관련 기술은 회사의 독점 재산입니다</li>
              <li>서비스의 모든 권리, 소유권, 이익은 회사에 귀속됩니다</li>
              <li>본 약관은 서비스에 대한 라이센스를 부여하지 않습니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">5.2 사용자 데이터</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>귀하는 업로드한 데이터에 대한 소유권을 보유합니다</li>
              <li>회사는 서비스 제공을 위해 필요한 범위 내에서 데이터를 사용할 수 있습니다</li>
              <li>익명화된 데이터는 서비스 개선을 위해 사용될 수 있습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 서비스 이용료</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">6.1 무료 서비스</h3>
            <p className="mb-3">
              현재 서비스는 무료로 제공됩니다. 향후 유료 플랜이 추가될 경우 
              사전에 공지하며, 기존 사용자는 선택적으로 업그레이드할 수 있습니다.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">6.2 향후 유료 서비스 (예정)</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>기본 기능은 계속 무료로 제공됩니다</li>
              <li>프리미엄 기능은 유료로 제공될 수 있습니다</li>
              <li>가격 정책은 사전 공지됩니다</li>
              <li>구독 취소 시 환불 정책이 적용됩니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 서비스 변경 및 중단</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.1 서비스 수정</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>회사는 언제든지 서비스를 수정, 개선, 중단할 수 있습니다</li>
              <li>중요한 변경 사항은 사전에 공지합니다</li>
              <li>긴급한 보안 업데이트는 즉시 적용될 수 있습니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.2 서비스 가용성</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>서비스의 지속적인 가용성을 보장하지 않습니다</li>
              <li>유지보수, 업그레이드로 인해 일시적으로 중단될 수 있습니다</li>
              <li>계획된 중단은 사전 공지합니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 책임의 제한</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">8.1 서비스 보증</h3>
            <p className="mb-3">
              서비스는 "있는 그대로" 제공되며, 다음을 보증하지 않습니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>서비스가 중단 없이 제공됨</li>
              <li>서비스에 오류가 없음</li>
              <li>서비스가 특정 목적에 적합함</li>
              <li>AI 추천의 정확성 또는 수익 보장</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">8.2 손해배상 제한</h3>
            <p className="mb-3">
              법이 허용하는 최대 범위 내에서:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>회사는 간접적, 우발적, 특별, 결과적 손해에 대해 책임지지 않습니다</li>
              <li>여기에는 수익 손실, 데이터 손실, 영업 중단 등이 포함됩니다</li>
              <li>회사의 총 책임은 서비스 이용료(있는 경우)를 초과하지 않습니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">8.3 광고 플랫폼 책임</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>회사는 제3자 광고 플랫폼의 작동에 대해 책임지지 않습니다</li>
              <li>각 플랫폼의 정책 변경, 서비스 중단은 회사의 책임 범위 밖입니다</li>
              <li>광고 성과는 플랫폼 및 외부 요인에 의해 영향을 받습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 면책 조항</h2>
            <p className="mb-3">
              귀하는 다음으로 인해 발생하는 모든 청구, 손해, 손실로부터 
              회사를 면책하고 방어하며 손해가 없도록 해야 합니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>귀하의 서비스 사용 또는 오용</li>
              <li>본 약관 위반</li>
              <li>타인의 권리 침해</li>
              <li>귀하가 제공한 콘텐츠 또는 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 계약 해지</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">10.1 사용자에 의한 해지</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>언제든지 계정을 삭제하여 서비스를 중단할 수 있습니다</li>
              <li>해지 시 모든 데이터가 삭제됩니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">10.2 회사에 의한 해지</h3>
            <p className="mb-3">
              다음의 경우 회사는 사전 통지 없이 계정을 정지하거나 해지할 수 있습니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>본 약관 위반</li>
              <li>불법 행위 또는 사기 행위</li>
              <li>다른 사용자 또는 회사에 피해를 주는 행위</li>
              <li>장기간 계정 미사용 (6개월 이상, 사전 통지 후)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 분쟁 해결</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">11.1 준거법</h3>
            <p className="mb-3">
              본 약관은 대한민국 법률에 따라 해석되고 적용됩니다.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">11.2 관할 법원</h3>
            <p className="mb-3">
              서비스와 관련된 분쟁은 회사 본사 소재지를 관할하는 법원의 
              전속 관할에 따릅니다.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">11.3 분쟁 해결 절차</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>먼저 고객 지원(anchursoo@naver.com)을 통해 문제 해결을 시도합니다</li>
              <li>해결되지 않을 경우 중재 또는 법적 절차를 진행할 수 있습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 일반 조항</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">12.1 약관 변경</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>회사는 필요 시 본 약관을 변경할 수 있습니다</li>
              <li>중요한 변경은 30일 전에 이메일로 통지합니다</li>
              <li>변경 후 서비스를 계속 사용하면 새로운 약관에 동의한 것으로 간주됩니다</li>
              <li>동의하지 않을 경우 서비스 사용을 중단하고 계정을 삭제할 수 있습니다</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">12.2 완전 합의</h3>
            <p className="mb-3">
              본 약관은 서비스 이용과 관련한 당사자 간의 완전한 합의를 구성하며, 
              이전의 모든 합의를 대체합니다.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">12.3 분리 가능성</h3>
            <p className="mb-3">
              본 약관의 일부 조항이 무효로 판단되더라도 나머지 조항은 
              계속 유효합니다.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">12.4 권리 포기</h3>
            <p className="mb-3">
              회사가 본 약관의 특정 조항을 집행하지 않더라도 
              해당 권리를 포기한 것으로 간주되지 않습니다.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">12.5 양도 금지</h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>귀하는 본 약관 또는 계정을 양도할 수 없습니다</li>
              <li>회사는 합병, 인수 등의 경우 약관을 양도할 수 있습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. 연락처 및 고객 지원</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>서비스명:</strong> NKLE 멀티채널 마케팅 플랫폼</p>
              <p><strong>이메일:</strong> anchursoo@naver.com</p>
              <p><strong>App ID:</strong> 1946347369607018</p>
              <p className="mt-3">
                <strong>고객 지원:</strong> 서비스 이용 중 문제가 발생하거나 
                질문이 있으신 경우 위 이메일로 연락주시기 바랍니다.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                영업일 기준 48시간 이내에 답변드리겠습니다.
              </p>
            </div>
          </section>

          <section className="mt-8 pt-8 border-t border-gray-300">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">동의 확인</h2>
            <p className="mb-4">
              계정을 생성하거나 서비스를 사용함으로써 귀하는 다음에 동의합니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>본 서비스 이용약관을 읽고 이해했습니다</li>
              <li>본 약관의 모든 조건에 동의합니다</li>
              <li>개인정보처리방침을 읽고 동의합니다</li>
              <li>만 14세 이상입니다</li>
              <li>연동하는 각 광고 플랫폼의 이용약관에도 동의합니다</li>
            </ul>
          </section>

          <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
            <p>본 서비스 이용약관은 2026년 1월 29일부터 적용됩니다.</p>
            <p className="mt-2">
              개인정보처리방침은 
              <a href="/privacy" className="text-blue-600 hover:underline ml-1">
                여기
              </a>에서 확인하실 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
